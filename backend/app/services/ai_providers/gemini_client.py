"""Thin wrapper around the Google Generative AI (Gemini) SDK."""
import google.generativeai as genai


def validate_key(api_key: str, model_version: str) -> tuple[bool, str]:
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_version)
        model.generate_content("ping", generation_config={"max_output_tokens": 8})
        return True, "Token valid."
    except Exception as exc:  # noqa: BLE001 - google SDK raises generic exceptions
        message = str(exc)
        if "API_KEY_INVALID" in message or "PERMISSION_DENIED" in message:
            return False, "Invalid API token."
        if "RESOURCE_EXHAUSTED" in message or "quota" in message.lower():
            return False, "Token valid but rate-limited / insufficient quota."
        return False, f"Validation failed: {message}"


def generate(api_key: str, model_version: str, system: str, prompt: str, max_tokens: int = 2000) -> str:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_version, system_instruction=system)
    response = model.generate_content(prompt, generation_config={"max_output_tokens": max_tokens})
    return response.text
