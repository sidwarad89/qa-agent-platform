from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.db_models import User
from app.models.schemas import SignupRequest, LoginRequest, TokenResponse, UserOut
from app.services.auth_service import (
    hash_password, verify_password, create_access_token, get_current_user,
)

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
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, username=user.username)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password.")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, username=user.username)


@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user
