"""Pydantic schemas shared across routers."""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


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
    input_tool: Optional[str] = None
    input_credentials: Optional[Dict[str, Any]] = {}
    output_tool: Optional[str] = None
    output_credentials: Optional[Dict[str, Any]] = {}
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


# --- Auth ---------------------------------------------------------------

class SignupRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str

    class Config:
        from_attributes = True


# --- Profile / stats / feedback -----------------------------------------

class ProfileStats(BaseModel):
    agents_count: int
    processes_count: int
    reviews_count: int


class AgentRecordCreate(BaseModel):
    name: str
    ai_provider: Optional[str] = None
    framework: Optional[str] = None


class AgentRecordOut(BaseModel):
    id: int
    name: str
    ai_provider: Optional[str] = None
    framework: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class FeedbackCreate(BaseModel):
    message: str


class FeedbackOut(BaseModel):
    id: int
    username: str
    message: str
    created_at: datetime


# --- MCP tools ------------------------------------------------------------

class McpExecuteRequest(BaseModel):
    tool: str                      # "jira" | "github" | "ado" | "testrail" | "xray" | "zephyr" | "gitlab"
    method: str                    # GET | POST | PUT | PATCH | DELETE
    resource: str                  # "issue" | "workitem" | "testcase" | "file" | ...
    item_id: Optional[str] = None
    body: Optional[Dict[str, Any]] = None
    credentials: Dict[str, Any]


class McpExecuteResponse(BaseModel):
    success: bool
    status_code: Optional[int] = None
    data: Optional[Any] = None
    detail: Optional[str] = None


# --- Agentic Process (chained agents + human-in-the-loop) ----------------

class AgenticProcessCreate(BaseModel):
    name: str


class AgenticStepOut(BaseModel):
    id: int
    step_index: int
    step_name: str
    prompt: Optional[str] = None
    output: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class AgenticProcessOut(BaseModel):
    id: int
    name: str
    created_at: datetime
    steps: List[AgenticStepOut] = []


class AgenticStepRunRequest(BaseModel):
    step_index: int
    step_name: str
    prompt: str
    ai_provider: str
    ai_model_version: str
    ai_api_key: str
    previous_output: Optional[str] = None
    feedback: Optional[str] = None   # comment or extracted doc text triggering a retry
