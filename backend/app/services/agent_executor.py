"""Executes the parsed step graph, streaming progress as an async generator
of AgentStepResult dicts, so the router can forward them over SSE.
"""
import json
import re
import base64
import uuid
from app.models.schemas import AgentConfig
from app.services.prompt_parser import parse_workflow
from app.services import code_generator
from app.services.ai_providers import anthropic_client, openai_client, gemini_client, openai_compatible_client
from app.services.connectors.jira_connector import JiraConnector
from app.services.mcp import dispatch as mcp_dispatch

_OPENAI_COMPATIBLE_PROVIDERS = {"mistral", "xai", "groq", "deepseek", "together", "perplexity"}


class _CompatClientWrapper:
    """Lets openai_compatible_client be called with the same generate(...) signature as the native clients."""
    def __init__(self, provider):
        self.provider = provider

    def generate(self, api_key, model_version, system, prompt, max_tokens=2000):
        return openai_compatible_client.generate(api_key, model_version, system, prompt, max_tokens, provider=self.provider)


def _ai_client_for(provider: str):
    native = {
        "anthropic": anthropic_client,
        "openai": openai_client,
        "gemini": gemini_client,
    }
    if provider in native:
        return native[provider]
    if provider in _OPENAI_COMPATIBLE_PROVIDERS:
        return _CompatClientWrapper(provider)
    raise ValueError(f"Unknown AI provider: {provider}")


async def run_agent(cfg: AgentConfig):
    """Async generator yielding dict step results as the agent progresses."""
    run_id = str(uuid.uuid4())
    ai_client = _ai_client_for(cfg.ai_provider)
    context = {}  # carries output of one step into the next

    # Fold in any extra input the user provided (free-text details + uploaded
    # documents) so the agent actually has that context to work with.
    effective_prompt = cfg.workflow_prompt
    if cfg.input_details:
        effective_prompt += f"\n\n--- Additional input provided by the user ---\n{cfg.input_details}"
    for f in (cfg.input_files or []):
        if f.get("content"):
            effective_prompt += f"\n\n--- Content of uploaded file '{f.get('name', 'file')}' ---\n{f['content'][:8000]}"

    yield {"run_id": run_id, "step_name": "parse_workflow", "status": "running", "detail": "Parsing your workflow description..."}
    steps = parse_workflow(cfg.ai_provider, cfg.ai_model_version, cfg.ai_api_key, effective_prompt)
    if not steps:
        yield {"run_id": run_id, "step_name": "parse_workflow", "status": "error",
               "detail": "Could not map your prompt to any known automation steps. Try rephrasing."}
        return
    yield {"run_id": run_id, "step_name": "parse_workflow", "status": "success", "detail": f"Identified steps: {', '.join(steps)}"}

    for step in steps:
        yield {"run_id": run_id, "step_name": step, "status": "running", "detail": f"Running {step}..."}
        try:
            if step == "fetch_input_item":
                summary = mcp_dispatch.fetch_item_summary(
                    tool=cfg.input_tool, credentials=cfg.input_credentials,
                    item_id=cfg.input_credentials.get("item_id", ""),
                )
                context["input_item_summary"] = summary
                yield {"run_id": run_id, "step_name": step, "status": "success",
                       "detail": f"Fetched {cfg.input_credentials.get('item_id', '')} from {cfg.input_tool}."}

            elif step == "generate_test_scenarios":
                summary = context.get("input_item_summary", "")[:3000]
                scenarios_text = ai_client.generate(
                    api_key=cfg.ai_api_key, model_version=cfg.ai_model_version,
                    system="You are a QA lead. Generate 10-20 concise test scenarios (one per line) for the given user story.",
                    prompt=summary, max_tokens=1500,
                )
                context["scenarios"] = [s.strip("- ") for s in scenarios_text.splitlines() if s.strip()]
                yield {"run_id": run_id, "step_name": step, "status": "success",
                       "detail": f"Generated {len(context['scenarios'])} scenarios.", "output": context["scenarios"]}

            elif step == "attach_scenarios_to_input":
                if cfg.input_tool == "jira":
                    legacy = JiraConnector(
                        base_url=cfg.input_credentials.get("base_url", ""),
                        username=cfg.input_credentials.get("username", ""),
                        api_key=cfg.input_credentials.get("api_key", ""),
                    )
                    body = "\n".join(f"- {s}" for s in context.get("scenarios", []))
                    result = legacy.create_subtask(
                        parent_issue_id=cfg.input_credentials.get("item_id", ""),
                        project_key=cfg.input_credentials.get("project_key", ""),
                        summary="Generated Test Scenarios", description=body,
                    )
                    created_key = result.get("key", "")
                    context.setdefault("created_items", []).append({"tool": "jira", "id": created_key, "what": "scenarios subtask"})
                    yield {"run_id": run_id, "step_name": step, "status": "success",
                           "detail": f"Scenarios attached as {created_key}." if created_key else "Scenarios attached."}
                else:
                    # "Attach to the same item" is inherently a ticket-tracker
                    # concept (subtask/comment) - it doesn't map cleanly onto
                    # code repos, test-case libraries, or CI tools the same way.
                    yield {"run_id": run_id, "step_name": step, "status": "error",
                           "detail": f"Attaching scenarios back to the same item only works for Jira right now (input tool was '{cfg.input_tool}')."}
                    return

            elif step == "generate_test_cases":
                scenarios_text = "\n".join(context.get("scenarios", []))
                cases_text = ai_client.generate(
                    api_key=cfg.ai_api_key, model_version=cfg.ai_model_version,
                    system=("You are a QA engineer. From these scenarios, generate 5-10 detailed test cases "
                            "covering positive, negative, edge, and security testing techniques. One per line."),
                    prompt=scenarios_text, max_tokens=2000,
                )
                context["test_cases"] = [c.strip("- ") for c in cases_text.splitlines() if c.strip()]
                yield {"run_id": run_id, "step_name": step, "status": "success",
                       "detail": f"Generated {len(context['test_cases'])} test cases.", "output": context["test_cases"]}

            elif step == "push_test_cases_to_output":
                target_id = cfg.output_credentials.get("item_id") or cfg.output_credentials.get("section_id") or cfg.input_credentials.get("item_id", "")
                pushed, url = mcp_dispatch.push_test_cases(
                    tool=cfg.output_tool, credentials=cfg.output_credentials,
                    target_id=target_id, test_cases=context.get("test_cases", []),
                )
                detail = f"Pushed {pushed} test cases to {cfg.output_tool}."
                if url:
                    detail += f" View: {url}"
                yield {"run_id": run_id, "step_name": step, "status": "success", "detail": detail, "output_url": url}

            elif step == "fetch_test_cases_from_output":
                if cfg.output_tool == "github":
                    from app.services.connectors.github_connector import GitHubConnector as LegacyGitHubConnector
                    connector = LegacyGitHubConnector(repo=cfg.output_credentials.get("repo", ""), api_key=cfg.output_credentials.get("api_key", ""))
                    files = connector.list_directory("generated-test-cases")
                    if not files:
                        yield {"run_id": run_id, "step_name": step, "status": "error",
                               "detail": "No generated-test-cases files found in the repo yet — push some first."}
                        return
                    latest = sorted(files, key=lambda f: f["name"])[-1]
                    raw_md = connector.get_file_content(latest["path"])
                    parts = re.split(r"##\s*Test Case\s*\d+\s*\n", raw_md)
                    context["test_cases"] = [p.strip() for p in parts if p.strip()]
                    yield {"run_id": run_id, "step_name": step, "status": "success",
                           "detail": f"Fetched {len(context['test_cases'])} test cases from {latest['path']}.",
                           "output": context["test_cases"]}
                else:
                    yield {"run_id": run_id, "step_name": step, "status": "error",
                           "detail": f"Fetching test cases back from '{cfg.output_tool}' isn't wired up yet — this currently only works for GitHub."}
                    return

            elif step == "generate_automation_scripts":
                scripts = code_generator.generate_scripts(
                    provider=cfg.ai_provider, model_version=cfg.ai_model_version, api_key=cfg.ai_api_key,
                    language=cfg.language, framework=cfg.framework, layout=cfg.framework_layout,
                    test_cases=context.get("test_cases", []),
                )
                context["scripts"] = scripts
                yield {"run_id": run_id, "step_name": step, "status": "success",
                       "detail": "Automation scripts generated.", "output": scripts}

            elif step == "push_scripts_to_new_branch":
                if cfg.output_tool != "github":
                    yield {"run_id": run_id, "step_name": step, "status": "error",
                           "detail": "Pushing scripts to a new branch currently only works when GitHub is the selected output tool."}
                    return
                if not context.get("scripts"):
                    yield {"run_id": run_id, "step_name": step, "status": "error",
                           "detail": "No generated scripts to push — 'generate_automation_scripts' must run first."}
                    return

                from app.services.connectors.github_connector import GitHubConnector as LegacyGitHubConnector
                connector = LegacyGitHubConnector(repo=cfg.output_credentials.get("repo", ""), api_key=cfg.output_credentials.get("api_key", ""))
                branch_name = f"automation-scripts-{uuid.uuid4().hex[:8]}"
                connector.create_branch(branch_name)

                # Split the generated code back into its individual files using
                # the same "// file: path" / "# file: path" markers the code
                # generator was asked to produce - falls back to one combined
                # file if the model didn't follow that convention this time.
                file_blocks = re.split(r"(?:^|\n)\s*(?://|#)\s*file:\s*(.+?)\s*\n", context["scripts"])
                pushed_files = []
                if len(file_blocks) > 1:
                    # file_blocks alternates: [preamble, path1, content1, path2, content2, ...]
                    for i in range(1, len(file_blocks) - 1, 2):
                        path, content = file_blocks[i].strip(), file_blocks[i + 1]
                        content_b64 = base64.b64encode(content.encode()).decode()
                        connector.create_file(
                            path=path, content_b64=content_b64,
                            message=f"Add generated automation script: {path}", branch=branch_name,
                        )
                        pushed_files.append(path)
                else:
                    ext = {"Python": "py", "JavaScript": "js", "TypeScript": "ts", "Java": "java"}.get(cfg.language, "txt")
                    path = f"generated-scripts/automation.{ext}"
                    content_b64 = base64.b64encode(context["scripts"].encode()).decode()
                    connector.create_file(path=path, content_b64=content_b64, message="Add generated automation scripts", branch=branch_name)
                    pushed_files.append(path)

                yield {"run_id": run_id, "step_name": step, "status": "success",
                       "detail": f"Pushed {len(pushed_files)} file(s) to new branch '{branch_name}': {', '.join(pushed_files)}"}

            elif step == "delete_created_items":
                # Ask the AI to find WHAT to delete and from WHICH tool, based on
                # the full prompt - which includes the reviewer's feedback text
                # AND the previous run's execution log (forwarded by the
                # frontend), so IDs mentioned there like "attached as SCRUM-5"
                # are actually visible to find, not just guessed at.
                extraction_raw = ai_client.generate(
                    api_key=cfg.ai_api_key, model_version=cfg.ai_model_version,
                    system=(
                        "Extract every deletion target mentioned or implied in this text. "
                        "Reply with ONLY a JSON array, nothing else, in this exact shape: "
                        '[{"tool": "jira"|"gitlab"|"ado"|"testrail", "id": "the exact id/key mentioned"}]. '
                        "Only include an entry if you can find a specific, real-looking id/key for it "
                        "(e.g. SCRUM-5, PROJ-12, a work item number, a TestRail case id) - never invent one. "
                        "If nothing has an identifiable id, reply []."
                    ),
                    prompt=effective_prompt, max_tokens=500,
                )
                match = re.search(r"\[.*\]", extraction_raw, re.DOTALL)
                targets = []
                if match:
                    try:
                        targets = json.loads(match.group(0))
                    except (json.JSONDecodeError, TypeError):
                        targets = []

                if not targets:
                    yield {"run_id": run_id, "step_name": step, "status": "error",
                           "detail": "Couldn't find a specific item id to delete in your request or the run history. "
                                     "Mention the exact key (e.g. 'delete SCRUM-5') if this happens again."}
                    return

                deleted, failed = [], []
                creds_by_tool = {}
                if cfg.input_tool:
                    creds_by_tool[cfg.input_tool] = cfg.input_credentials
                if cfg.output_tool:
                    creds_by_tool[cfg.output_tool] = cfg.output_credentials

                for t in targets:
                    tool, item_id = t.get("tool"), t.get("id")
                    creds = creds_by_tool.get(tool)
                    if not creds:
                        failed.append(f"{item_id} ({tool}: not connected as input/output for this agent)")
                        continue
                    try:
                        mcp_dispatch.delete_item(tool=tool, credentials=creds, item_id=item_id)
                        deleted.append(item_id)
                    except Exception as exc:
                        failed.append(f"{item_id}: {exc}")

                if deleted and not failed:
                    yield {"run_id": run_id, "step_name": step, "status": "success", "detail": f"Deleted: {', '.join(deleted)}."}
                elif deleted and failed:
                    yield {"run_id": run_id, "step_name": step, "status": "success",
                           "detail": f"Deleted: {', '.join(deleted)}. Could not delete: {'; '.join(failed)}"}
                else:
                    yield {"run_id": run_id, "step_name": step, "status": "error", "detail": f"Could not delete anything: {'; '.join(failed)}"}
                    return

            elif step in ("analyze_logs_for_bugs", "generate_bug_report"):
                yield {"run_id": run_id, "step_name": step, "status": "error",
                       "detail": "Log input not yet wired up in this MVP — add a log-upload step to enable this."}

        except Exception as exc:  # noqa: BLE001 - surface any failure to the live UI log
            yield {"run_id": run_id, "step_name": step, "status": "error", "detail": f"Failed: {exc}"}
            return

    yield {"run_id": run_id, "step_name": "done", "status": "success", "detail": "Agent run complete."}
