"""Generates framework-specific automation code from a list of test cases,
using the user's selected AI model and the chosen framework/layout as
context so the output matches their conventions.
"""
from app.services.ai_providers import anthropic_client, openai_client, gemini_client


def _client_for(provider: str):
    return {
        "anthropic": anthropic_client,
        "openai": openai_client,
        "gemini": gemini_client,
    }[provider]


def generate_scripts(
    provider: str,
    model_version: str,
    api_key: str,
    language: str,
    framework: str,
    layout: str,
    test_cases: list[str],
) -> str:
    client = _client_for(provider)
    system = (
        f"You are a senior SDET. Generate {framework} automation scripts in {language}, "
        f"following the '{layout}' project layout convention. "
        "Output complete, runnable code with clear file separators (e.g. '// file: path/to/File.ext')."
    )
    prompt = "Generate automation scripts for these test cases:\n\n" + "\n".join(
        f"- {tc}" for tc in test_cases
    )
    return client.generate(api_key=api_key, model_version=model_version, system=system, prompt=prompt, max_tokens=4000)
