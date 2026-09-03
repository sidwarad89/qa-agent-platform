from typing import List
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.db_models import User, AgentRecord, AgenticProcess, Feedback
from app.models.schemas import (
    ProfileStats, AgentRecordCreate, AgentRecordUpdate, AgentRecordOut,
    FeedbackCreate, FeedbackOut, UsageAnalytics, DailyUsagePoint,
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("/stats", response_model=ProfileStats)
def get_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    agents_count = db.query(AgentRecord).filter(AgentRecord.user_id == current_user.id).count()
    processes_count = db.query(AgenticProcess).filter(AgenticProcess.user_id == current_user.id, AgenticProcess.confirmed == True).count()
    return ProfileStats(agents_count=agents_count, processes_count=processes_count, reviews_count=0)


@router.post("/agents", response_model=AgentRecordOut)
def record_agent(
    payload: AgentRecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Called once, right when the user clicks 'Build Agent' - powers the Agents stat
    and stores enough config for this agent to be reused inside an Agentic Process."""
    record = AgentRecord(
        user_id=current_user.id,
        name=payload.name,
        ai_provider=payload.ai_provider,
        ai_model_version=payload.ai_model_version,
        framework=payload.framework,
        workflow_prompt=payload.workflow_prompt,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/agents", response_model=List[AgentRecordOut])
def list_agents(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(AgentRecord)
        .filter(AgentRecord.user_id == current_user.id)
        .order_by(AgentRecord.created_at.desc())
        .all()
    )


def _get_owned_agent(agent_id: int, current_user: User, db: Session) -> AgentRecord:
    agent = db.query(AgentRecord).filter(AgentRecord.id == agent_id).first()
    if not agent or agent.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Agent not found.")
    return agent


@router.patch("/agents/{agent_id}", response_model=AgentRecordOut)
def update_agent(
    agent_id: int,
    payload: AgentRecordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    agent = _get_owned_agent(agent_id, current_user, db)
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(agent, key, value)
    db.commit()
    db.refresh(agent)
    return agent


@router.delete("/agents/{agent_id}")
def delete_agent(
    agent_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    agent = _get_owned_agent(agent_id, current_user, db)
    db.delete(agent)
    db.commit()
    return {"success": True}


@router.post("/feedback", response_model=FeedbackOut)
def create_feedback(
    payload: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = Feedback(user_id=current_user.id, message=payload.message)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return FeedbackOut(id=entry.id, username=current_user.username, message=entry.message, created_at=entry.created_at)


@router.get("/feedback", response_model=List[FeedbackOut])
def list_feedback(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entries = db.query(Feedback).join(User).order_by(Feedback.created_at.desc()).all()
    return [
        FeedbackOut(id=e.id, username=e.user.username, message=e.message, created_at=e.created_at)
        for e in entries
    ]


@router.get("/analytics", response_model=UsageAnalytics)
def usage_analytics(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Daily agents/processes created for the last 14 days, for this user's own Analytics tab."""
    window_days = 14
    since = datetime.utcnow() - timedelta(days=window_days - 1)

    agents = db.query(AgentRecord).filter(AgentRecord.user_id == current_user.id, AgentRecord.created_at >= since).all()
    processes = db.query(AgenticProcess).filter(AgenticProcess.user_id == current_user.id, AgenticProcess.confirmed == True, AgenticProcess.created_at >= since).all()

    agent_counts = {}
    for a in agents:
        key = a.created_at.strftime("%Y-%m-%d")
        agent_counts[key] = agent_counts.get(key, 0) + 1

    process_counts = {}
    for p in processes:
        key = p.created_at.strftime("%Y-%m-%d")
        process_counts[key] = process_counts.get(key, 0) + 1

    days = []
    for i in range(window_days):
        day = (since + timedelta(days=i)).strftime("%Y-%m-%d")
        days.append(DailyUsagePoint(
            date=day,
            agents_created=agent_counts.get(day, 0),
            processes_created=process_counts.get(day, 0),
        ))

    return UsageAnalytics(days=days)
