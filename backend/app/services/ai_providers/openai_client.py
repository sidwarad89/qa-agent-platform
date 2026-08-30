"""Thin wrapper around the OpenAI SDK."""
from openai import OpenAI, AuthenticationError, RateLimitError, PermissionDeniedError


def validate_key(api_key: str, model_version: str) -> tuple[bool, str]:
    try:
        client = OpenAI(api_key=api_key)
        client.chat.completions.create(
            model=model_version,
            max_tokens=8,
            messages=[{"role": "user", "content": "ping"}],
        )
        return True, "Token valid."
    except AuthenticationError:
        return False, "Invalid API token."
    except PermissionDeniedError:
        return False, "Token valid but lacks permission for this model."
    except RateLimitError:
        return False, "Token valid but rate-limited / insufficient quota."
    except Exception as exc:  # noqa: BLE001
        return False, f"Validation failed: {exc}"


def generate(api_key: str, model_version: str, system: str, prompt: str, max_tokens: int = 2000) -> str:
    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=model_version,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
    )
    return response.choices[0].message.content
