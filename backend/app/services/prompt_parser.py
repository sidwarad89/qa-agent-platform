"""Turns the user's free-text workflow description into an ordered list
of known step identifiers the executor can act on. Uses the user's own
selected AI model to do the parsing, constrained to a fixed vocabulary
so the executor never receives a step it doesn't know how to run.
"""
import json
from app.services.ai_providers import anthropic_client, openai_client, gemini_client, openai_compatible_client

_OPENAI_COMPATIBLE_PROVIDERS = {"mistral", "xai", "groq", "deepseek", "together", "perplexity"}

KNOWN_STEPS = [
    "fetch_input_item",        # pull the Jira/ADO story/work item
    "generate_test_scenarios",
    "attach_scenarios_to_input", # write scenarios back as a subtask/comment
    "generate_test_cases",
    "push_test_cases_to_output", # any connected tool
    "fetch_test_cases_from_output", # read previously-pushed test cases back (currently: GitHub)
    "generate_automation_scripts",
    "push_scripts_to_new_branch", # commit generated scripts to a new branch (GitHub)
    "delete_created_items",    # remove something this agent (or a previous run of it) created
    "analyze_logs_for_bugs",     # bug-finding use case
    "generate_bug_report",
]

PARSE_SYSTEM_PROMPT = f"""You convert a QA engineer's plain-English automation request into an
ordered JSON list of step identifiers, using ONLY this fixed vocabulary:
{json.dumps(KNOWN_STEPS)}

Guidance on when to use which step:
- "fetch_input_item" + "generate_test_scenarios" + "attach_scenarios_to_input": pulling a user
  story/work item and writing generated scenarios back to it as a subtask.
- "generate_test_cases" + "push_test_cases_to_output": turning scenarios into test cases and
  pushing them to whichever tool is connected as the output.
- "fetch_test_cases_from_output": use this when the user wants test cases READ BACK from a tool
  they were previously pushed to (e.g. "take those test cases from GitHub..."), as opposed to
  freshly generating them in the same run.
- "generate_automation_scripts" + "push_scripts_to_new_branch": generating code from test cases
  and committing it to a new branch, as opposed to the main branch.
- "delete_created_items": use this whenever the user asks to delete, remove, undo, or clean up
  something that was created by this agent (a subtask, a pushed test case, a work item, etc.),
  whether from earlier in this same request or from a previous run being referenced.

Rules:
- Return ONLY a JSON array of strings, nothing else.
- Only include steps the user actually asked for, in the order they should run.
- If the request doesn't map to any known step, return an empty array.
"""


class _CompatClientWrapper:
    """Lets openai_compatible_client be called with the same generate(...) signature as the native clients."""
    def __init__(self, provider):
        self.provider = provider

    def generate(self, api_key, model_version, system, prompt, max_tokens=2000):
        return openai_compatible_client.generate(api_key, model_version, system, prompt, max_tokens, provider=self.provider)


def _client_for(provider: str):
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


def parse_workflow(provider: str, model_version: str, api_key: str, workflow_prompt: str) -> list[str]:
    client = _client_for(provider)
    raw = client.generate(
        api_key=api_key,
        model_version=model_version,
        system=PARSE_SYSTEM_PROMPT,
        prompt=workflow_prompt,
        max_tokens=500,
    )
    return _extract_steps(raw)


def _extract_steps(raw: str) -> list[str]:
    """Robust against the many ways different AI models format their reply -
    markdown code fences, a stray preamble sentence, or just plain text
    mentioning the step names - so a slightly-off response doesn't silently
    become 'no steps found' and confuse the user into thinking their PROMPT
    was the problem when it was actually just a formatting quirk."""
    import re

    cleaned = raw.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()

    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if match:
        try:
            steps = json.loads(match.group(0))
            filtered = [s for s in steps if isinstance(s, str) and s in KNOWN_STEPS]
            if filtered:
                return filtered
        except (json.JSONDecodeError, TypeError):
            pass

    # Last resort: the model mentioned step names in plain prose instead of
    # JSON. Scan for them in the order they appear rather than giving up.
    found = []
    for step in KNOWN_STEPS:
        idx = cleaned.find(step)
        if idx != -1:
            found.append((idx, step))
    found.sort(key=lambda pair: pair[0])
    return [step for _, step in found]
