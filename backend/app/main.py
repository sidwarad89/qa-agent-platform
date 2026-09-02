import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import models, pm_tools, output_tools, agent, auth, profile, mcp, agentic_process
from app.database import Base, engine
from app.models import db_models  # noqa: F401 - imported so tables register on Base

app = FastAPI(title="QA Agent Builder Platform")

# Creates any tables that don't exist yet. Safe to run on every startup.
Base.metadata.create_all(bind=engine)

# Set ALLOWED_ORIGINS as a comma-separated env var in production, e.g.
# ALLOWED_ORIGINS=https://your-frontend.vercel.app,http://localhost:5173
_default_origins = "http://localhost:5173"
allowed_origins = os.getenv("ALLOWED_ORIGINS", _default_origins).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(models.router)
app.include_router(pm_tools.router)
app.include_router(output_tools.router)
app.include_router(agent.router)
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(mcp.router)
app.include_router(agentic_process.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
