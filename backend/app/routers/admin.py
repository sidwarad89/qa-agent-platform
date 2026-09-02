from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc

from app.database import get_db
from app.models.db_models import User, AgentRecord, AgenticProcess, PageVisit
from app.models.schemas import AdminUserOut, AdminStats, AdminTimeline, TimeBucket, RecentLogin
from app.services.auth_service import require_admin, get_current_user, oauth2_scheme

router = APIRouter(prefix="/api/admin", tags=["admin"])
track_router = APIRouter(prefix="/api/track", tags=["tracking"])


@router.get("/users", response_model=List[AdminUserOut])
def list_users(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        agents_count = db.query(AgentRecord).filter(AgentRecord.user_id == u.id).count()
        processes_count = db.query(AgenticProcess).filter(AgenticProcess.user_id == u.id).count()
        result.append(AdminUserOut(
            id=u.id, username=u.username, email=u.email, is_admin=u.is_admin,
            created_at=u.created_at, last_login=u.last_login,
            agents_count=agents_count, processes_count=processes_count,
        ))
    return result


@router.get("/stats", response_model=AdminStats)
def platform_stats(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    week_ago = now - timedelta(days=7)

    total_users = db.query(User).count()
    total_visits = db.query(PageVisit).count()
    visits_today = db.query(PageVisit).filter(PageVisit.created_at >= today_start).count()
    signups_today = db.query(User).filter(User.created_at >= today_start).count()
    new_users_7d = db.query(User).filter(User.created_at >= week_ago).count()

    return AdminStats(
        total_users=total_users, total_visits=total_visits, visits_today=visits_today,
        signups_today=signups_today, new_users_7d=new_users_7d,
    )


@track_router.post("/visit")
def track_visit(path: str = "/", request: Request = None, db: Session = Depends(get_db)):
    """Called once when the app loads. Works whether or not the person is logged in yet -
    if they have a valid token it's attributed to them, otherwise it's an anonymous visit."""
    user_id = None
    auth_header = request.headers.get("authorization") if request else None
    if auth_header and auth_header.lower().startswith("bearer "):
        try:
            from app.services.auth_service import SECRET_KEY, ALGORITHM
            from jose import jwt
            payload = jwt.decode(auth_header.split(" ", 1)[1], SECRET_KEY, algorithms=[ALGORITHM])
            user_id = int(payload.get("sub")) if payload.get("sub") else None
        except Exception:
            user_id = None

    visit = PageVisit(user_id=user_id, path=path)
    db.add(visit)
    db.commit()
    return {"tracked": True}


@router.get("/timeline", response_model=AdminTimeline)
def signup_timeline(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """New-member counts across standard windows, plus a 5-year yearly breakdown."""
    now = datetime.utcnow()

    windows = [
        ("Last 1 hour", now - timedelta(hours=1)),
        ("Last 24 hours", now - timedelta(hours=24)),
        ("Last 7 days", now - timedelta(days=7)),
        ("Last 30 days", now - timedelta(days=30)),
        ("Last 3 months", now - timedelta(days=90)),
        ("Last 6 months", now - timedelta(days=182)),
        ("Last 1 year", now - timedelta(days=365)),
    ]
    buckets = [
        TimeBucket(label=label, count=db.query(User).filter(User.created_at >= since).count())
        for label, since in windows
    ]

    yearly = []
    for i in range(4, -1, -1):  # 5 years back through this year
        year = now.year - i
        start = datetime(year, 1, 1)
        end = datetime(year + 1, 1, 1)
        count = db.query(User).filter(User.created_at >= start, User.created_at < end).count()
        yearly.append(TimeBucket(label=str(year), count=count))

    return AdminTimeline(buckets=buckets, yearly=yearly)


@router.get("/recent-logins", response_model=List[RecentLogin])
def recent_logins(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Who's actually signed in, most recent first - directly answers 'who logged in'."""
    users = (
        db.query(User)
        .filter(User.last_login.isnot(None))
        .order_by(User.last_login.desc())
        .limit(50)
        .all()
    )
    return [RecentLogin(username=u.username, last_login=u.last_login, is_admin=u.is_admin) for u in users]
