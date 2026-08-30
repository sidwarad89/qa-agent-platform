from fastapi import APIRouter
from app.models.schemas import ToolCredentialRequest, ToolCredentialResponse
from app.services.connectors.jira_connector import JiraConnector
from app.services.connectors.ado_connector import ADOConnector

router = APIRouter(prefix="/api/input-tools", tags=["input-tools"])


@router.post("/validate", response_model=ToolCredentialResponse)
def validate_input_tool(req: ToolCredentialRequest):
    try:
        if req.tool == "jira":
            connector = JiraConnector(req.base_url or "", req.username or "", req.api_key)
        elif req.tool == "ado":
            extra = req.extra or {}
            connector = ADOConnector(extra.get("organization", ""), extra.get("project", ""), req.api_key)
        else:
            return ToolCredentialResponse(valid=False, message=f"Unsupported input tool: {req.tool}")
        valid, message = connector.validate()
        return ToolCredentialResponse(valid=valid, message=message)
    except Exception as exc:  # noqa: BLE001
        return ToolCredentialResponse(valid=False, message=f"Validation error: {exc}")
