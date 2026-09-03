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
    language: Optional[str] = None
    input_tool: Optional[str] = None
    input_credentials: Optional[Dict[str, Any]] = {}
    output_tool: Optional[str] = None
    output_credentials: Optional[Dict[str, Any]] = {}
    framework: Optional[str] = None
    framework_layout: Optional[str] = None
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
    identifier: str  # username OR email
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    is_admin: bool = False


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    is_admin: bool = False
    avatar_data: Optional[str] = None
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProfileUpdateRequest(BaseModel):
    avatar_data: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# --- Profile / stats / feedback -----------------------------------------

class ProfileStats(BaseModel):
    agents_count: int
    processes_count: int
    reviews_count: int


class DailyUsagePoint(BaseModel):
    date: str  # "YYYY-MM-DD"
    agents_created: int
    processes_created: int


class UsageAnalytics(BaseModel):
    days: List[DailyUsagePoint]


class AgentRecordCreate(BaseModel):
    name: str
    ai_provider: Optional[str] = None
    ai_model_version: Optional[str] = None
    framework: Optional[str] = None
    workflow_prompt: Optional[str] = None


class AgentRecordUpdate(BaseModel):
    name: Optional[str] = None
    ai_provider: Optional[str] = None
    ai_model_version: Optional[str] = None
    framework: Optional[str] = None
    workflow_prompt: Optional[str] = None


class AgentRecordOut(BaseModel):
    id: int
    name: str
    ai_provider: Optional[str] = None
    ai_model_version: Optional[str] = None
    framework: Optional[str] = None
    workflow_prompt: Optional[str] = None
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


class McpValidateRequest(BaseModel):
    tool: str
    credentials: Dict[str, Any]


class McpValidateResponse(BaseModel):
    valid: bool
    message: str


# --- Agentic Process (chained agents + human-in-the-loop) ----------------

class AgenticProcessCreate(BaseModel):
    name: str


class AgenticProcessUpdate(BaseModel):
    name: Optional[str] = None


class AgenticStepOut(BaseModel):
    id: int
    step_index: int
    step_name: str
    prompt: Optional[str] = None
    output: Optional[str] = None
    output_url: Optional[str] = None
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
    feedback: Optional[str] = None   # comment or extracted doc text triggering a re-execute
    # Optional: push this step's output straight into an MCP tool (e.g. as a Jira subtask)
    mcp_tool: Optional[str] = None
    mcp_credentials: Optional[Dict[str, Any]] = None
    mcp_parent_item_id: Optional[str] = None


# --- Admin / analytics -----------------------------------------------------

class AdminUserOut(BaseModel):
    id: int
    username: str
    email: str
    is_admin: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    agents_count: int
    processes_count: int


class AdminStats(BaseModel):
    total_users: int
    total_visits: int
    visits_today: int
    signups_today: int
    new_users_7d: int


class TimeBucket(BaseModel):
    label: str
    count: int


class AdminTimeline(BaseModel):
    buckets: List[TimeBucket]       # last 1h / 24h / 7d / 30d / 3mo / 6mo / 1y
    yearly: List[TimeBucket]        # per-year signups for the last 5 years


class RecentLogin(BaseModel):
    username: str
    last_login: Optional[datetime] = None
    is_admin: bool
