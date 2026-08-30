# QA Agent Builder Platform

A full-stack app for visually configuring an AI-driven QA automation agent:
pick an AI model, language, input tool (Jira/ADO), output tool (TestRail/Jira/ADO/GitHub),
test framework + layout, then describe your workflow in plain English and let the
agent execute it end to end.

## What's included (working MVP / vertical slice)

- 7-step React wizard UI (colorful, card-based, live credential validation)
- FastAPI backend with:
  - AI token validation for Anthropic, OpenAI, Gemini
  - Jira, Azure DevOps, TestRail, GitHub connectors (validate + core actions)
  - An orchestrator that parses your natural-language prompt into known steps and
    executes them in order, streaming live progress to the UI via Server-Sent Events
- One fully wired example flow: fetch a Jira story → generate test scenarios →
  attach back to Jira → generate test cases → push to TestRail → generate
  automation scripts in your chosen language/framework/layout

## What's stubbed / not yet built

- `analyze_logs_for_bugs` / `generate_bug_report` steps are recognized by the
  parser but have no log-ingestion UI yet — add a file-upload step to wire this up
- No persistent run history / saved configs (SQLAlchemy models folder is scaffolded but empty)
- No authentication — this is a local-first MVP, **not safe to expose publicly as-is**
  (see Security Notes below)
- GitHub connector only has `create_file`; wire up more actions as needed
- ADO connector only reads work items; no write/create actions yet

## Running locally

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Then open http://localhost:5173 — the frontend calls the backend at http://localhost:8000.

## Before you publish this publicly

This MVP intentionally keeps things simple for local use. Before exposing it to
the internet:
1. Add real authentication (user accounts, not just an open UI)
2. Never accept or forward raw API keys without encrypting them at rest
   (the `cryptography` package is already in requirements.txt for this)
3. Move secrets out of `.env` files and into a proper secrets manager
4. Add rate limiting on the `/validate` endpoints so people can't burn your
   users' API quota with repeated bad requests
5. Add HTTPS/TLS termination in front of the FastAPI app

## Extending the agent

New workflow steps go in two places:
1. `backend/app/services/prompt_parser.py` — add the step name to `KNOWN_STEPS`
2. `backend/app/services/agent_executor.py` — add an `elif step == "your_step":` branch

New connectors go in `backend/app/services/connectors/` following the existing
pattern (a `validate()` method plus whatever action methods you need).
