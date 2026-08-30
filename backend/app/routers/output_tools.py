from fastapi import APIRouter
from app.models.schemas import ToolCredentialRequest, ToolCredentialResponse
from app.services.connectors.testrail_connector import TestRailConnector
from app.services.connectors.jira_connector import JiraConnector
from app.services.connectors.ado_connector import ADOConnector
from app.services.connectors.github_connector import GitHubConnector

router = APIRouter(prefix="/api/output-tools", tags=["output-tools"])


@router.post("/validate", response_model=ToolCredentialResponse)
def validate_output_tool(req: ToolCredentialRequest):
    try:
        extra = req.extra or {}
        if req.tool == "testrail":
            connector = TestRailConnector(req.base_url or "", req.username or "", req.api_key)
        elif req.tool == "jira":
            connector = JiraConnector(req.base_url or "", req.username or "", req.api_key)
        elif req.tool == "ado":
            connector = ADOConnector(extra.get("organization", ""), extra.get("project", ""), req.api_key)
        elif req.tool == "github":
            connector = GitHubConnector(extra.get("repo", ""), req.api_key)
        else:
            return ToolCredentialResponse(valid=False, message=f"Unsupported output tool: {req.tool}")
        valid, message = connector.validate()
        return ToolCredentialResponse(valid=valid, message=message)
    except Exception as exc:  # noqa: BLE001
        return ToolCredentialResponse(valid=False, message=f"Validation error: {exc}")
