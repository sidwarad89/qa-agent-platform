"""
Several providers (Mistral, xAI/Grok, Groq, DeepSeek, Together AI,
Perplexity) all expose the same OpenAI-shaped /chat/completions API, just
under a different base_url. Rather than writing five near-identical
clients, this one takes the base_url as a parameter.
"""
from openai import OpenAI, AuthenticationError, RateLimitError, PermissionDeniedError

PROVIDER_BASE_URLS = {
    "mistral": "https://api.mistral.ai/v1",
    "xai": "https://api.x.ai/v1",
    "groq": "https://api.groq.com/openai/v1",
    "deepseek": "https://api.deepseek.com/v1",
    "together": "https://api.together.xyz/v1",
    "perplexity": "https://api.perplexity.ai",
}


def validate_key(api_key: str, model_version: str, provider: str = "mistral") -> tuple[bool, str]:
    try:
        client = OpenAI(api_key=api_key, base_url=PROVIDER_BASE_URLS[provider])
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


def generate(api_key: str, model_version: str, system: str, prompt: str, max_tokens: int = 2000, provider: str = "mistral") -> str:
    client = OpenAI(api_key=api_key, base_url=PROVIDER_BASE_URLS[provider])
    response = client.chat.completions.create(
        model=model_version,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
    )
    return response.choices[0].message.content
