"""Pydantic schemas shared across routers."""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class ModelValidationRequest(BaseModel):
    provider: str          # "anthropic" | "openai" | "gemini"
    model_version: str
    api_key: str


class ModelValidationResponse(BaseModel):
    valid: bool
    message: str


class ToolCredentialRequest(BaseModel):
    tool: str               # "jira" | "ado" | "testrail" | "github"
    username: Optional[str] = None
    api_key: str
    base_url: Optional[str] = None
    extra: Optional[Dict[str, Any]] = None


class ToolCredentialResponse(BaseModel):
    valid: bool
    message: str


class AgentConfig(BaseModel):
    ai_provider: str
    ai_model_version: str
    ai_api_key: str
    language: str
    input_tool: str
    input_credentials: Dict[str, Any]
    output_tool: str
    output_credentials: Dict[str, Any]
    framework: str
    framework_layout: str
    custom_framework_details: Optional[str] = None
    custom_framework_files: Optional[List[Dict[str, Any]]] = None
    custom_layout_details: Optional[str] = None
    workflow_prompt: str


class AgentStepResult(BaseModel):
    step_name: str
    status: str              # "running" | "success" | "error"
    detail: str
    output: Optional[Any] = None


class AgentRunResponse(BaseModel):
    run_id: str
    steps: List[AgentStepResult]
    final_status: str
