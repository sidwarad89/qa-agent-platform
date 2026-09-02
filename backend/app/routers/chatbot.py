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
