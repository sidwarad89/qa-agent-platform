from fastapi import APIRouter, Depends, HTTPException

from app.models.db_models import User
from app.models.schemas import McpExecuteRequest, McpExecuteResponse, McpValidateRequest, McpValidateResponse
from app.services.auth_service import get_current_user
from app.services.mcp.jira_connector import JiraConnector
from app.services.mcp.github_connector import GitHubConnector
from app.services.mcp.generic_connector import GenericMCPConnector
from app.services.mcp.xray_connector import XrayConnector
from app.services.mcp.zephyr_connector import ZephyrConnector
from app.services.mcp.aws_codecommit_connector import AWSCodeCommitConnector
from app.services.mcp.base import infer_method_from_instruction

router = APIRouter(prefix="/api/mcp", tags=["mcp"])


def _build_connector(tool: str, creds: dict):
    if tool == "jira":
        return JiraConnector(base_url=creds.get("base_url", ""), email=creds.get("username", ""), api_token=creds.get("api_key", ""))
    if tool == "github":
        return GitHubConnector(repo=creds.get("repo", ""), api_token=creds.get("api_key", ""))
    if tool in ("ado", "testrail", "gitlab"):
        return GenericMCPConnector(
            tool=tool, base_url=creds.get("base_url", ""), api_token=creds.get("api_key", ""),
            username=creds.get("username", ""), extra=creds,
        )
    if tool == "xray":
        return XrayConnector(client_id=creds.get("username", ""), client_secret=creds.get("api_key", ""), project_key=creds.get("project_key", ""))
    if tool == "zephyr":
        return ZephyrConnector(api_token=creds.get("api_key", ""), project_key=creds.get("project_key", ""))
    if tool == "aws":
        return AWSCodeCommitConnector(
            access_key_id=creds.get("username", ""), secret_access_key=creds.get("api_key", ""),
            region=creds.get("region", ""), repo=creds.get("repo", ""),
        )
    raise HTTPException(status_code=400, detail=f"Unknown MCP tool '{tool}'.")


@router.post("/validate", response_model=McpValidateResponse)
def validate_mcp_tool(payload: McpValidateRequest, current_user: User = Depends(get_current_user)):
    """Actually checks the given credentials work before the UI marks a tool as Connected."""
    try:
        connector = _build_connector(payload.tool, payload.credentials)
    except HTTPException:
        raise
    except Exception as exc:
        return McpValidateResponse(valid=False, message=str(exc))

    if not hasattr(connector, "validate"):
        return McpValidateResponse(valid=False, message="Validation isn't implemented for this tool yet.")

    valid, message = connector.validate()
    return McpValidateResponse(valid=valid, message=message)


@router.post("/execute", response_model=McpExecuteResponse)
def execute_mcp_action(payload: McpExecuteRequest, current_user: User = Depends(get_current_user)):
    connector = _build_connector(payload.tool, payload.credentials)
    try:
        result = connector.execute(
            method=payload.method,
            resource=payload.resource,
            item_id=payload.item_id,
            payload=payload.body,
        )
    except Exception as exc:  # surfaces connector/auth/network errors clearly to the UI
        raise HTTPException(status_code=502, detail=f"{payload.tool} action failed: {exc}")

    return McpExecuteResponse(**result)


@router.post("/infer-method")
def infer_method(instruction: str):
    """Given a plain-English instruction, returns which HTTP method it implies.
    Used by the agent executor to decide GET/POST/PUT/PATCH/DELETE automatically."""
    return {"method": infer_method_from_instruction(instruction)}
