from fastapi import APIRouter, Depends, HTTPException

from app.models.db_models import User
from app.models.schemas import McpExecuteRequest, McpExecuteResponse
from app.services.auth_service import get_current_user
from app.services.mcp.jira_connector import JiraConnector
from app.services.mcp.github_connector import GitHubConnector
from app.services.mcp.generic_connector import GenericMCPConnector
from app.services.mcp.base import infer_method_from_instruction

router = APIRouter(prefix="/api/mcp", tags=["mcp"])


def _build_connector(payload: McpExecuteRequest):
    creds = payload.credentials
    if payload.tool == "jira":
        return JiraConnector(base_url=creds.get("base_url", ""), email=creds.get("username", ""), api_token=creds.get("api_key", ""))
    if payload.tool == "github":
        return GitHubConnector(repo=creds.get("repo", ""), api_token=creds.get("api_key", ""))
    if payload.tool in ("ado", "testrail", "xray", "zephyr", "gitlab"):
        return GenericMCPConnector(
            tool=payload.tool,
            base_url=creds.get("base_url", ""),
            api_token=creds.get("api_key", ""),
            username=creds.get("username", ""),
            extra=creds,
        )
    raise HTTPException(status_code=400, detail=f"Unknown MCP tool '{payload.tool}'.")


@router.post("/execute", response_model=McpExecuteResponse)
def execute_mcp_action(payload: McpExecuteRequest, current_user: User = Depends(get_current_user)):
    connector = _build_connector(payload)
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
