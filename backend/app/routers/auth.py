from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.db_models import User, PageVisit
from app.models.schemas import (
    SignupRequest, LoginRequest, TokenResponse, UserOut,
    ProfileUpdateRequest, ChangePasswordRequest,
)
from app.services.auth_service import (
    hash_password, verify_password, create_access_token, get_current_user, is_admin_username,
)
from app.services.email_service import send_welcome_email

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing = (
        db.query(User)
        .filter((User.username == payload.username) | (User.email == payload.email))
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="That username or email is already registered.")

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        is_admin=is_admin_username(payload.username),
        last_login=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    try:
        send_welcome_email(user.email, user.username)
    except Exception:
        pass  # never block signup on email failures

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, username=user.username, is_admin=user.is_admin)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password.")

    # Bootstrap admin rights if this username is listed in ADMIN_USERNAMES.
    # Synced BOTH ways on every login so removing a name from ADMIN_USERNAMES
    # revokes access immediately - is_admin can never be set any other way.
    user.is_admin = is_admin_username(user.username)
    user.last_login = datetime.utcnow()
    db.commit()

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, username=user.username, is_admin=user.is_admin)


@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/profile", response_model=UserOut)
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.avatar_data is not None:
        # Keep the DB light - reject anything absurdly large (resize happens client-side already).
        if len(payload.avatar_data) > 500_000:
            raise HTTPException(status_code=400, detail="Image is too large. Please use a smaller picture.")
        current_user.avatar_data = payload.avatar_data
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"success": True}
