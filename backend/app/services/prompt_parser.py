"""Turns the user's free-text workflow description into an ordered list
of known step identifiers the executor can act on. Uses the user's own
selected AI model to do the parsing, constrained to a fixed vocabulary
so the executor never receives a step it doesn't know how to run.
"""
import json
from app.services.ai_providers import anthropic_client, openai_client, gemini_client

KNOWN_STEPS = [
    "fetch_input_item",        # pull the Jira/ADO story/work item
    "generate_test_scenarios",
    "attach_scenarios_to_input", # write scenarios back as a subtask/comment
    "generate_test_cases",
    "push_test_cases_to_output", # TestRail / Jira / ADO / GitHub
    "generate_automation_scripts",
    "analyze_logs_for_bugs",     # bug-finding use case
    "generate_bug_report",
]

PARSE_SYSTEM_PROMPT = f"""You convert a QA engineer's plain-English automation request into an
ordered JSON list of step identifiers, using ONLY this fixed vocabulary:
{json.dumps(KNOWN_STEPS)}

Rules:
- Return ONLY a JSON array of strings, nothing else.
- Only include steps the user actually asked for, in the order they should run.
- If the request doesn't map to any known step, return an empty array.
"""


def _client_for(provider: str):
    return {
        "anthropic": anthropic_client,
        "openai": openai_client,
        "gemini": gemini_client,
    }[provider]


def parse_workflow(provider: str, model_version: str, api_key: str, workflow_prompt: str) -> list[str]:
    client = _client_for(provider)
    raw = client.generate(
        api_key=api_key,
        model_version=model_version,
        system=PARSE_SYSTEM_PROMPT,
        prompt=workflow_prompt,
        max_tokens=500,
    )
    try:
        steps = json.loads(raw)
        return [s for s in steps if s in KNOWN_STEPS]
    except (json.JSONDecodeError, TypeError):
        return []
