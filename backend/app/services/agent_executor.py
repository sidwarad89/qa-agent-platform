"""Executes the parsed step graph, streaming progress as an async generator
of AgentStepResult dicts, so the router can forward them over SSE.
"""
import json
import uuid
from app.models.schemas import AgentConfig
from app.services.prompt_parser import parse_workflow
from app.services import code_generator
from app.services.ai_providers import anthropic_client, openai_client, gemini_client, openai_compatible_client
from app.services.connectors.jira_connector import JiraConnector
from app.services.connectors.ado_connector import ADOConnector
from app.services.connectors.testrail_connector import TestRailConnector
from app.services.connectors.github_connector import GitHubConnector

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


def _build_input_connector(cfg: AgentConfig):
    creds = cfg.input_credentials
    if cfg.input_tool == "jira":
        return JiraConnector(creds["base_url"], creds["username"], creds["api_key"])
    if cfg.input_tool == "ado":
        return ADOConnector(creds["organization"], creds["project"], creds["api_key"])
    raise ValueError(f"Unsupported input tool: {cfg.input_tool}")


def _build_output_connector(cfg: AgentConfig):
    creds = cfg.output_credentials
    if cfg.output_tool == "testrail":
        return TestRailConnector(creds["base_url"], creds["username"], creds["api_key"])
    if cfg.output_tool == "jira":
        return JiraConnector(creds["base_url"], creds["username"], creds["api_key"])
    if cfg.output_tool == "ado":
        return ADOConnector(creds["organization"], creds["project"], creds["api_key"])
    if cfg.output_tool == "github":
        return GitHubConnector(creds["repo"], creds["api_key"])
    raise ValueError(f"Unsupported output tool: {cfg.output_tool}")


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
                connector = _build_input_connector(cfg)
                item_id = cfg.input_credentials.get("item_id", "")
                data = connector.get_issue(item_id) if cfg.input_tool == "jira" else connector.get_work_item(item_id)
                context["input_item"] = data
                yield {"run_id": run_id, "step_name": step, "status": "success", "detail": f"Fetched {item_id}."}

            elif step == "generate_test_scenarios":
                summary = json.dumps(context.get("input_item", {}))[:3000]
                scenarios_text = ai_client.generate(
                    api_key=cfg.ai_api_key, model_version=cfg.ai_model_version,
                    system="You are a QA lead. Generate 10-20 concise test scenarios (one per line) for the given user story.",
                    prompt=summary, max_tokens=1500,
                )
                context["scenarios"] = [s.strip("- ") for s in scenarios_text.splitlines() if s.strip()]
                yield {"run_id": run_id, "step_name": step, "status": "success",
                       "detail": f"Generated {len(context['scenarios'])} scenarios.", "output": context["scenarios"]}

            elif step == "attach_scenarios_to_input":
                connector = _build_input_connector(cfg)
                if cfg.input_tool == "jira":
                    body = "\n".join(f"- {s}" for s in context.get("scenarios", []))
                    connector.create_subtask(
                        parent_issue_id=cfg.input_credentials.get("item_id", ""),
                        project_key=cfg.input_credentials.get("project_key", ""),
                        summary="Generated Test Scenarios", description=body,
                    )
                yield {"run_id": run_id, "step_name": step, "status": "success", "detail": "Scenarios attached."}

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
                connector = _build_output_connector(cfg)
                pushed = 0
                if cfg.output_tool == "testrail":
                    section_id = cfg.output_credentials.get("section_id", "")
                    for tc in context.get("test_cases", []):
                        connector.add_case(section_id=section_id, title=tc[:250], steps=tc)
                        pushed += 1
                yield {"run_id": run_id, "step_name": step, "status": "success", "detail": f"Pushed {pushed} test cases."}

            elif step == "generate_automation_scripts":
                scripts = code_generator.generate_scripts(
                    provider=cfg.ai_provider, model_version=cfg.ai_model_version, api_key=cfg.ai_api_key,
                    language=cfg.language, framework=cfg.framework, layout=cfg.framework_layout,
                    test_cases=context.get("test_cases", []),
                )
                context["scripts"] = scripts
                yield {"run_id": run_id, "step_name": step, "status": "success",
                       "detail": "Automation scripts generated.", "output": scripts}

            elif step in ("analyze_logs_for_bugs", "generate_bug_report"):
                yield {"run_id": run_id, "step_name": step, "status": "error",
                       "detail": "Log input not yet wired up in this MVP — add a log-upload step to enable this."}

        except Exception as exc:  # noqa: BLE001 - surface any failure to the live UI log
            yield {"run_id": run_id, "step_name": step, "status": "error", "detail": f"Failed: {exc}"}
            return

    yield {"run_id": run_id, "step_name": "done", "status": "success", "detail": "Agent run complete."}
