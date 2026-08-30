import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.models.schemas import AgentConfig
from app.services.agent_executor import run_agent

router = APIRouter(prefix="/api/agent", tags=["agent"])


@router.post("/build")
async def build_agent(cfg: AgentConfig):
    """Streams progress as Server-Sent Events so the frontend can show a
    live execution log while the agent runs."""

    async def event_stream():
        async for result in run_agent(cfg):
            yield f"data: {json.dumps(result)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
