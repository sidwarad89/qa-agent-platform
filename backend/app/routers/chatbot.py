from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.models.db_models import User
from app.services.auth_service import get_current_user
from app.services.ai_providers import anthropic_client, openai_client, gemini_client, openai_compatible_client

router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])

_OPENAI_COMPATIBLE_PROVIDERS = {"mistral", "xai", "groq", "deepseek", "together", "perplexity"}

PLATFORM_KNOWLEDGE = """You are the in-app assistant for "QA Agent Builder", a platform for building AI-powered
QA automation. Answer questions ONLY about how to use this platform - be concise and practical.

What the platform offers:
- Build: pick an AI engine (Anthropic Claude, OpenAI GPT, Google Gemini, Mistral, xAI Grok, Groq, DeepSeek,
  Together AI, or Perplexity), a coding language, and a test framework (Selenium, TestNG, Robot Framework,
  Cucumber, Playwright, PyTest, or a fully Custom one), then describe a workflow in plain English to generate
  automation code.
- MCP Tools: connect Jira, Azure DevOps, GitHub, GitLab, TestRail, Xray, or Zephyr Scale. Once connected, any
  agent or agentic process can read, create, update, or delete data in them just by being told to in plain
  English (e.g. "delete test case QA-42").
- Agentic Process: chain multiple agents together (e.g. one agent generates test scenarios from a Jira story,
  a second turns those into test cases in TestRail). After each step a human reviews the output, and can
  either approve it ("Good to go") or leave feedback/attach a doc and click "Re-Execute" to regenerate that
  step with the feedback taken into account.
- Profile: shows how many agents and agentic processes you've built, plus a feedback box.
- Manage (admin only): shows total users, visit counts, and a user table.

If asked something unrelated to this platform, politely say you can only help with QA Agent Builder itself."""


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    text: str


class ChatbotRequest(BaseModel):
    provider: str
    model_version: str
    api_key: str
    message: str
    history: Optional[List[ChatMessage]] = []


class ChatbotResponse(BaseModel):
    reply: str


class OnboardingPlanRequest(BaseModel):
    provider: str
    model_version: str
    api_key: str
    goal: str


class PlanStep(BaseModel):
    title: str
    description: str


class OnboardingPlanResponse(BaseModel):
    steps: List[PlanStep]


def _generate(provider: str, model_version: str, api_key: str, system: str, prompt: str) -> str:
    if provider == "anthropic":
        return anthropic_client.generate(api_key, model_version, system, prompt, max_tokens=800)
    if provider == "openai":
        return openai_client.generate(api_key, model_version, system, prompt, max_tokens=800)
    if provider == "gemini":
        return gemini_client.generate(api_key, model_version, system, prompt, max_tokens=800)
    if provider in _OPENAI_COMPATIBLE_PROVIDERS:
        return openai_compatible_client.generate(api_key, model_version, system, prompt, max_tokens=800, provider=provider)
    raise HTTPException(status_code=400, detail=f"Unknown AI provider '{provider}'.")


@router.post("/message", response_model=ChatbotResponse)
def send_message(payload: ChatbotRequest, current_user: User = Depends(get_current_user)):
    history_text = "\n".join(f"{m.role}: {m.text}" for m in (payload.history or [])[-6:])
    prompt = f"{history_text}\nuser: {payload.message}" if history_text else payload.message

    try:
        reply = _generate(payload.provider, payload.model_version, payload.api_key, PLATFORM_KNOWLEDGE, prompt)
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
    try:
        raw = _generate(payload.provider, payload.model_version, payload.api_key, PLAN_SYSTEM_PROMPT, payload.goal)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not generate a plan: {exc}")

    # Models sometimes wrap JSON in markdown fences or add stray text - extract the array robustly.
    import json, re
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if not match:
        raise HTTPException(status_code=502, detail="The AI didn't return a usable plan. Try rephrasing your goal.")
    try:
        parsed = json.loads(match.group(0))
        steps = [PlanStep(title=s["title"], description=s["description"]) for s in parsed]
    except Exception:
        raise HTTPException(status_code=502, detail="The AI's plan wasn't in the expected format. Try again.")

    return OnboardingPlanResponse(steps=steps)
