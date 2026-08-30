from fastapi import APIRouter
from app.models.schemas import ModelValidationRequest, ModelValidationResponse
from app.services.ai_providers import anthropic_client, openai_client, gemini_client

router = APIRouter(prefix="/api/models", tags=["models"])

_VALIDATORS = {
    "anthropic": anthropic_client.validate_key,
    "openai": openai_client.validate_key,
    "gemini": gemini_client.validate_key,
}


@router.post("/validate", response_model=ModelValidationResponse)
def validate_model_token(req: ModelValidationRequest):
    validator = _VALIDATORS.get(req.provider)
    if not validator:
        return ModelValidationResponse(valid=False, message=f"Unknown provider: {req.provider}")
    valid, message = validator(req.api_key, req.model_version)
    return ModelValidationResponse(valid=valid, message=message)
