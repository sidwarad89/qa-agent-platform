"""Generates framework-specific automation code from a list of test cases,
using the user's selected AI model and the chosen framework/layout as
context so the output matches their conventions.
"""
from app.services.ai_providers import anthropic_client, openai_client, gemini_client, openai_compatible_client

_OPENAI_COMPATIBLE_PROVIDERS = {"mistral", "xai", "groq", "deepseek", "together", "perplexity"}


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
