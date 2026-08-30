"""Thin wrapper around the Anthropic SDK used for both credential
validation and the actual generation calls the agent makes."""
import anthropic


def validate_key(api_key: str, model_version: str) -> tuple[bool, str]:
    try:
        client = anthropic.Anthropic(api_key=api_key)
        # A minimal, cheap call is enough to confirm the key + model work.
        client.messages.create(
            model=model_version,
            max_tokens=8,
            messages=[{"role": "user", "content": "ping"}],
        )
        return True, "Token valid."
    except anthropic.AuthenticationError:
        return False, "Invalid API token."
    except anthropic.PermissionDeniedError:
        return False, "Token valid but lacks permission for this model."
    except anthropic.RateLimitError:
        return False, "Token valid but rate-limited / insufficient quota."
    except Exception as exc:  # noqa: BLE001 - surface any provider error to the UI
        return False, f"Validation failed: {exc}"


def generate(api_key: str, model_version: str, system: str, prompt: str, max_tokens: int = 2000) -> str:
    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model=model_version,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return "".join(block.text for block in response.content if block.type == "text")
