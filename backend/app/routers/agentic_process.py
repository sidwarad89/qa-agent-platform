from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.db_models import User, AgenticProcess, AgenticStep
from app.models.schemas import (
    AgenticProcessCreate, AgenticProcessOut,
    AgenticStepRunRequest, AgenticStepOut,
)
from app.services.auth_service import get_current_user
from app.services.ai_providers import anthropic_client, openai_client, gemini_client, openai_compatible_client
from app.services.mcp.jira_connector import JiraConnector
from app.services.mcp.github_connector import GitHubConnector
from app.services.mcp.generic_connector import GenericMCPConnector
from app.services.mcp.xray_connector import XrayConnector
from app.services.mcp.zephyr_connector import ZephyrConnector
from app.services.mcp.aws_codecommit_connector import AWSCodeCommitConnector

router = APIRouter(prefix="/api/agentic", tags=["agentic-process"])

_OPENAI_COMPATIBLE_PROVIDERS = {"mistral", "xai", "groq", "deepseek", "together", "perplexity"}


def _generate(provider: str, model_version: str, api_key: str, system: str, prompt: str) -> str:
    if provider == "anthropic":
        return anthropic_client.generate(api_key, model_version, system, prompt)
    if provider == "openai":
        return openai_client.generate(api_key, model_version, system, prompt)
    if provider == "gemini":
        return gemini_client.generate(api_key, model_version, system, prompt)
    if provider in _OPENAI_COMPATIBLE_PROVIDERS:
        return openai_compatible_client.generate(api_key, model_version, system, prompt, provider=provider)
    raise HTTPException(status_code=400, detail=f"Unknown AI provider '{provider}'.")


def _push_to_mcp_and_get_url(tool: str, credentials: dict, parent_item_id: str, step_name: str, output_text: str) -> Optional[str]:
    """Pushes the step's output into whichever tool is connected, and returns a
    human-viewable URL to verify it at, where that tool's API makes one available.
    Jira, GitHub, GitLab, Azure DevOps, and TestRail all get a real clickable link.
    Xray, Zephyr, and AWS CodeCommit still get the push, just without a browsable link yet."""
    base_url = credentials.get("base_url", "").rstrip("/")

    if tool == "jira":
        connector = JiraConnector(base_url=base_url, email=credentials.get("username", ""), api_token=credentials.get("api_key", ""))
        result = connector.execute(
            method="POST", resource="issue", item_id=None,
            payload={"fields": {
                "project": {"key": credentials.get("project_key", "")},
                "parent": {"key": parent_item_id} if parent_item_id else None,
                "summary": step_name,
                "description": {
                    "type": "doc", "version": 1,
                    "content": [{"type": "paragraph", "content": [{"type": "text", "text": output_text[:5000]}]}],
                },
                "issuetype": {"name": "Subtask"},
            }},
        )
        if result.get("success") and result.get("data", {}).get("key"):
            return f"{base_url}/browse/{result['data']['key']}"
        return None

    if tool == "github":
        connector = GitHubConnector(repo=credentials.get("repo", ""), api_token=credentials.get("api_key", ""))
        result = connector.execute(method="POST", resource="issue", item_id=None, payload={"title": step_name, "body": output_text[:60000]})
        if result.get("success"):
            return result.get("data", {}).get("html_url")
        return None

    if tool == "gitlab":
        from urllib.parse import quote
        connector = GenericMCPConnector(
            tool="gitlab", base_url=base_url, api_token=credentials.get("api_key", ""),
            extra={"project_encoded": quote(credentials.get("repo", ""), safe="")},
        )
        result = connector.execute(method="POST", resource="issue", item_id=None, payload={"title": step_name, "description": output_text[:60000]})
        if result.get("success"):
            return result.get("data", {}).get("web_url")
        return None

    if tool == "ado":
        connector = GenericMCPConnector(
            tool="ado", api_token=credentials.get("api_key", ""),
            extra={"organization": credentials.get("organization", ""), "project": credentials.get("project", "")},
        )
        patch_body = [
            {"op": "add", "path": "/fields/System.Title", "value": step_name},
            {"op": "add", "path": "/fields/System.Description", "value": output_text[:5000]},
        ]
        result = connector.execute(method="POST", resource="workitem", item_id=None, payload=patch_body)
        if result.get("success") and result.get("data", {}).get("id"):
            org = credentials.get("organization", "")
            proj = credentials.get("project", "")
            return f"https://dev.azure.com/{org}/{proj}/_workitems/edit/{result['data']['id']}"
        return None

    if tool == "testrail":
        connector = GenericMCPConnector(
            tool="testrail", base_url=base_url, api_token=credentials.get("api_key", ""),
            username=credentials.get("username", ""), extra={"section_id": parent_item_id or "1"},
        )
        result = connector.execute(method="POST", resource="case", item_id=None, payload={"title": step_name, "custom_steps": output_text[:2000]})
        if result.get("success") and result.get("data", {}).get("id"):
            return f"{base_url}/index.php?/cases/view/{result['data']['id']}"
        return None

    if tool in ("xray", "zephyr", "aws"):
        # These pushes happen for real, but we don't yet build a clean browse
        # link for them - the raw output still shows inline either way.
        try:
            if tool == "xray":
                XrayConnector(
                    client_id=credentials.get("username", ""), client_secret=credentials.get("api_key", ""),
                    project_key=credentials.get("project_key", ""),
                ).execute(method="POST", resource="test", item_id=None, payload={"summary": step_name})
            elif tool == "zephyr":
                ZephyrConnector(
                    api_token=credentials.get("api_key", ""), project_key=credentials.get("project_key", ""),
                ).execute(method="POST", resource="testcase", item_id=None, payload={"name": step_name})
            elif tool == "aws":
                AWSCodeCommitConnector(
                    access_key_id=credentials.get("username", ""), secret_access_key=credentials.get("api_key", ""),
                    region=credentials.get("region", ""), repo=credentials.get("repo", ""),
                ).execute(method="POST", resource="file", item_id=f"{step_name.replace(' ', '_')}.txt",
                          payload={"content": output_text, "message": f"Add output for {step_name}"})
        except Exception:
            pass
        return None

    return None


@router.post("/process", response_model=AgenticProcessOut)
def create_process(payload: AgenticProcessCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    process = AgenticProcess(user_id=current_user.id, name=payload.name)
    db.add(process)
    db.commit()
    db.refresh(process)
    return AgenticProcessOut(id=process.id, name=process.name, created_at=process.created_at, steps=[])


@router.get("/process", response_model=List[AgenticProcessOut])
def list_processes(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    processes = (
        db.query(AgenticProcess)
        .filter(AgenticProcess.user_id == current_user.id)
        .order_by(AgenticProcess.created_at.desc())
        .all()
    )
    return [
        AgenticProcessOut(
            id=p.id, name=p.name, created_at=p.created_at,
            steps=[AgenticStepOut.model_validate(s) for s in p.steps],
        )
        for p in processes
    ]


def _get_owned_process(process_id: int, current_user: User, db: Session) -> AgenticProcess:
    process = db.query(AgenticProcess).filter(AgenticProcess.id == process_id).first()
    if not process or process.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Process not found.")
    return process


@router.post("/process/{process_id}/steps/run", response_model=AgenticStepOut)
def run_step(
    process_id: int,
    payload: AgenticStepRunRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Runs (or re-runs) one step. If a feedback comment/doc is supplied, this
    is treated as a Retry: the previous output for this step is deleted first,
    then a fresh output is generated taking the feedback into account."""
    process = _get_owned_process(process_id, current_user, db)

    existing = (
        db.query(AgenticStep)
        .filter(AgenticStep.process_id == process.id, AgenticStep.step_index == payload.step_index)
        .first()
    )

    is_retry = bool(payload.feedback) and existing is not None
    if is_retry:
        db.delete(existing)  # "1st generated data should be deleted from where it generated"
        db.commit()
        existing = None

    system = (
        "You are one stage in a multi-step QA automation pipeline. "
        "Produce only the requested output for this stage, nothing else."
    )
    prompt = payload.prompt
    if payload.previous_output:
        prompt += f"\n\n--- Output carried over from the previous step ---\n{payload.previous_output}"
    if payload.feedback:
        prompt += (
            f"\n\n--- Reviewer feedback on the previous attempt (address this) ---\n{payload.feedback}"
        )

    output_text = _generate(payload.ai_provider, payload.ai_model_version, payload.ai_api_key, system, prompt)

    output_url = None
    if payload.mcp_tool and payload.mcp_credentials:
        try:
            output_url = _push_to_mcp_and_get_url(
                payload.mcp_tool, payload.mcp_credentials, payload.mcp_parent_item_id, payload.step_name, output_text,
            )
        except Exception:
            output_url = None  # if the push fails, the text output still shows - never block the step

    if existing:
        existing.output = output_text
        existing.output_url = output_url
        existing.status = "awaiting_review"
        step = existing
    else:
        step = AgenticStep(
            process_id=process.id,
            step_index=payload.step_index,
            step_name=payload.step_name,
            prompt=payload.prompt,
            output=output_text,
            output_url=output_url,
            status="awaiting_review",
        )
        db.add(step)

    db.commit()
    db.refresh(step)
    return AgenticStepOut.model_validate(step)


@router.post("/process/{process_id}/steps/{step_index}/approve", response_model=AgenticStepOut)
def approve_step(
    process_id: int,
    step_index: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    process = _get_owned_process(process_id, current_user, db)
    step = (
        db.query(AgenticStep)
        .filter(AgenticStep.process_id == process.id, AgenticStep.step_index == step_index)
        .first()
    )
    if not step:
        raise HTTPException(status_code=404, detail="Step not found.")
    step.status = "approved"
    db.commit()
    db.refresh(step)
    return AgenticStepOut.model_validate(step)
