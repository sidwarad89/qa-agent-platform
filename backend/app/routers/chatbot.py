import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.models.db_models import User
from app.services.auth_service import get_current_user
from app.services.ai_providers import gemini_client

router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])

# The chatbot and onboarding-plan features always use the PLATFORM's own key,
# set once by the admin - individual users never need to provide one for these.
# Set these on Render:
#   PLATFORM_AI_API_KEY=<your Gemini key>
#   PLATFORM_AI_MODEL=gemini-2.0-flash   (optional, this is the default)
PLATFORM_AI_API_KEY = os.getenv("PLATFORM_AI_API_KEY", "")
PLATFORM_AI_MODEL = os.getenv("PLATFORM_AI_MODEL", "gemini-3.6-flash")

PLATFORM_KNOWLEDGE = """You are the in-app assistant for "QA Agent Builder", a platform for building AI-powered
QA automation. Answer questions ONLY about how to use this platform - be concise and practical.

What the platform offers:
- Build: pick an AI engine (Anthropic Claude, OpenAI GPT, Google Gemini, Mistral, xAI Grok, Groq, DeepSeek,
  Together AI, or Perplexity), a coding language, and a test framework (Selenium, TestNG, Robot Framework,
  Cucumber, Playwright, PyTest, or a fully Custom one), then describe a workflow in plain English to generate
  automation code.
- MCP Tools: connect Jira, Azure DevOps, GitHub, GitLab, TestRail, Xray, Zephyr Scale, or AWS CodeCommit. Once
  connected, any agent or agentic process can read, create, update, or delete data in them just by being told
  to in plain English (e.g. "delete test case QA-42").
- Agentic Process: chain multiple already-built agents together by name (e.g. a scenario-generator agent,
  then a test-case agent, then an uploader agent). A Human-in-Loop checkpoint is optional after each agent -
  when enabled, the reviewer can either approve ("Good to go") or leave feedback/attach a doc and click
  "Re-Execute" to regenerate that step. Steps without a checkpoint auto-continue to the next agent.
- Profile: profile picture, password change, stats (agents/processes built), and a feedback box.
- Manage (admin only): total users, visit counts, signup timeline, and a full user table.

If asked something unrelated to this platform, politely say you can only help with QA Agent Builder itself."""


def _require_configured():
    if not PLATFORM_AI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="The chatbot isn't configured yet - ask the platform admin to set PLATFORM_AI_API_KEY.",
        )


def _generate(system: str, prompt: str, max_tokens: int = 800) -> str:
    return gemini_client.generate(PLATFORM_AI_API_KEY, PLATFORM_AI_MODEL, system, prompt, max_tokens=max_tokens)


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    text: str


class ChatbotRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []


class ChatbotResponse(BaseModel):
    reply: str


class OnboardingPlanRequest(BaseModel):
    goal: str


class PlanStep(BaseModel):
    title: str
    description: str


class OnboardingPlanResponse(BaseModel):
    steps: List[PlanStep]


@router.post("/message", response_model=ChatbotResponse)
def send_message(payload: ChatbotRequest, current_user: User = Depends(get_current_user)):
    _require_configured()
    history_text = "\n".join(f"{m.role}: {m.text}" for m in (payload.history or [])[-6:])
    prompt = f"{history_text}\nuser: {payload.message}" if history_text else payload.message

    try:
        reply = _generate(PLATFORM_KNOWLEDGE, prompt)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Chatbot request failed: {exc}")

    return ChatbotResponse(reply=reply)


PLAN_SYSTEM_PROMPT = PLATFORM_KNOWLEDGE + """

The user will describe their goal or scope of work. Turn that into a short, ordered, practical plan for
using THIS platform specifically - reference real sections by name (Build, MCP Tools, Agentic Process,
Profile). Keep it to 3-6 steps.

Respond with ONLY a JSON array, nothing else, no markdown fences, in this exact shape:
[{"title": "short imperative title", "description": "one or two sentences of practical detail"}]
"""


@router.post("/plan", response_model=OnboardingPlanResponse)
def generate_onboarding_plan(payload: OnboardingPlanRequest, current_user: User = Depends(get_current_user)):
    _require_configured()
    try:
        raw = _generate(PLAN_SYSTEM_PROMPT, payload.goal)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not generate a plan: {exc}")

    steps = _parse_plan_response(raw)
    if not steps:
        raise HTTPException(
            status_code=502,
            detail="Couldn't parse a plan from that response. Try describing your goal in one or two clear sentences.",
        )
    return OnboardingPlanResponse(steps=steps)


def _parse_plan_response(raw: str):
    """Tries JSON first (the format we asked for), then falls back to parsing a
    plain numbered list, so a slightly-off model response still produces a usable plan."""
    import json, re

    cleaned = raw.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()

    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group(0))
            return [PlanStep(title=s["title"], description=s.get("description", "")) for s in parsed if s.get("title")]
        except Exception:
            pass  # fall through to the plain-text parser below

    # Fallback: parse lines like "1. Title - description" or "1. Title: description"
    steps = []
    for line in cleaned.splitlines():
        line = line.strip().lstrip("-*").strip()
        line = re.sub(r"^\d+[.)]\s*", "", line)
        if not line:
            continue
        parts = re.split(r"\s*[-:–]\s*", line, maxsplit=1)
        title = parts[0].strip()
        description = parts[1].strip() if len(parts) > 1 else ""
        if title:
            steps.append(PlanStep(title=title[:80], description=description))
    return steps[:6]
