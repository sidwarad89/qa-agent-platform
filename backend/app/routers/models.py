from fastapi import APIRouter
from app.models.schemas import ModelValidationRequest, ModelValidationResponse
from app.services.ai_providers import anthropic_client, openai_client, gemini_client, openai_compatible_client

router = APIRouter(prefix="/api/models", tags=["models"])

_NATIVE_VALIDATORS = {
    "anthropic": anthropic_client.validate_key,
    "openai": openai_client.validate_key,
    "gemini": gemini_client.validate_key,
}

# Providers that speak the OpenAI-compatible API shape, routed through one shared client.
_OPENAI_COMPATIBLE_PROVIDERS = {"mistral", "xai", "groq", "deepseek", "together", "perplexity"}


@router.post("/validate", response_model=ModelValidationResponse)
def validate_model_token(req: ModelValidationRequest):
    if req.provider in _NATIVE_VALIDATORS:
        valid, message = _NATIVE_VALIDATORS[req.provider](req.api_key, req.model_version)
        return ModelValidationResponse(valid=valid, message=message)

    if req.provider in _OPENAI_COMPATIBLE_PROVIDERS:
        valid, message = openai_compatible_client.validate_key(req.api_key, req.model_version, provider=req.provider)
        return ModelValidationResponse(valid=valid, message=message)

    return ModelValidationResponse(valid=False, message=f"Unknown provider: {req.provider}")
