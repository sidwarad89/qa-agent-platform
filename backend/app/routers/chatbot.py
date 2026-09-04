import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.models.db_models import User
from app.services.auth_service import get_current_user
from app.services.ai_providers import anthropic_client, openai_client, gemini_client, openai_compatible_client

router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])

# The chatbot and onboarding-plan features always use the PLATFORM's own key,
# set once by the admin - individual users never need to provide one for these.
# Set these on Render:
#   PLATFORM_AI_PROVIDER=groq              (or anthropic, openai, gemini, mistral, xai, deepseek, together, perplexity)
#   PLATFORM_AI_API_KEY=<your key for that provider>
#   PLATFORM_AI_MODEL=llama-3.3-70b-versatile   (optional, this is the default for groq)
PLATFORM_AI_PROVIDER = os.getenv("PLATFORM_AI_PROVIDER", "groq")
PLATFORM_AI_API_KEY = os.getenv("PLATFORM_AI_API_KEY", "")
PLATFORM_AI_MODEL = os.getenv("PLATFORM_AI_MODEL", "llama-3.3-70b-versatile")

_OPENAI_COMPATIBLE_PROVIDERS = {"mistral", "xai", "groq", "deepseek", "together", "perplexity"}

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
    if PLATFORM_AI_PROVIDER == "anthropic":
        return anthropic_client.generate(PLATFORM_AI_API_KEY, PLATFORM_AI_MODEL, system, prompt, max_tokens=max_tokens)
    if PLATFORM_AI_PROVIDER == "openai":
        return openai_client.generate(PLATFORM_AI_API_KEY, PLATFORM_AI_MODEL, system, prompt, max_tokens=max_tokens)
    if PLATFORM_AI_PROVIDER == "gemini":
        return gemini_client.generate(PLATFORM_AI_API_KEY, PLATFORM_AI_MODEL, system, prompt, max_tokens=max_tokens)
    if PLATFORM_AI_PROVIDER in _OPENAI_COMPATIBLE_PROVIDERS:
        return openai_compatible_client.generate(PLATFORM_AI_API_KEY, PLATFORM_AI_MODEL, system, prompt, max_tokens=max_tokens, provider=PLATFORM_AI_PROVIDER)
    raise HTTPException(status_code=500, detail=f"Unknown PLATFORM_AI_PROVIDER '{PLATFORM_AI_PROVIDER}'.")


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

The user will describe their goal or scope of work, in their own casual words. Turn that into a short,
ordered, PRACTICAL, PLATFORM-SPECIFIC plan - not generic QA advice. Every step must name an actual section
of this platform (MCP Tools, Build, Agentic Process, Profile) and say exactly what to do inside it, tailored
to what the user described. Never give steps like "write test cases" or "plan your testing strategy" in the
abstract - those aren't things you do "on this platform" without naming where and how.

Here is ONE EXAMPLE, shown ONLY so you understand the required JSON shape and level of specificity.
Do NOT copy this example's content. It answers a different, unrelated user goal:

EXAMPLE user goal: "I want to generate test cases from a Jira user story and upload them to TestRail."
EXAMPLE output:
[
  {"title": "Connect Jira under MCP Tools", "description": "Go to MCP Tools, click Connect on Jira, and enter your Jira URL, email, and API token so the platform can read your user stories."},
  {"title": "Connect TestRail under MCP Tools", "description": "In the same MCP Tools page, connect TestRail with your TestRail URL, email, and API key so generated test cases can be uploaded there."},
  {"title": "Build an agent for this workflow", "description": "Go to Build, name it something like 'Jira to TestRail Test Case Agent', pick your AI engine and language, and in the workflow prompt describe pulling the story, generating test cases, and uploading them to TestRail."},
  {"title": "Run it and check your Agents page", "description": "Click Build Agent, then check the Agents page afterward to confirm it was saved so you can reuse it later, including inside an Agentic Process."}
]

END OF EXAMPLE. Now generate a brand-new plan for the REAL user goal given below (a completely different
request from the example above - do not reuse any wording from the example). Base it entirely on what
THIS user actually wrote.

Keep it to 3-6 steps. Respond with ONLY a JSON array, nothing else, no markdown fences, in this exact shape:
[{"title": "short imperative title", "description": "one or two sentences of practical, specific detail"}]
"""


@router.post("/plan", response_model=OnboardingPlanResponse)
def generate_onboarding_plan(payload: OnboardingPlanRequest, current_user: User = Depends(get_current_user)):
    _require_configured()
    try:
        raw = _generate(PLAN_SYSTEM_PROMPT, f"REAL user goal: {payload.goal}", max_tokens=1200)
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
        # Skip lines that are just raw JSON syntax - a sign the model's reply wasn't
        # clean prose or clean JSON, and this line isn't a real step.
        if re.fullmatch(r'[\[\]{},]*', line) or re.match(r'^"(title|description)"\s*:', line):
            continue
        parts = re.split(r"\s*[-:–]\s*", line, maxsplit=1)
        title = parts[0].strip().strip('"').strip(",")
        description = parts[1].strip().strip('"').strip(",") if len(parts) > 1 else ""
        if title and len(title) > 2:
            steps.append(PlanStep(title=title[:80], description=description))
    return steps[:6]
