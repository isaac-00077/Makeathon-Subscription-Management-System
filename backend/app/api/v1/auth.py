import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.config import settings
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
)
from app.models.user import User, UserRole, PasswordResetToken
from app.schemas.user import (
    UserCreate,
    UserResponse,
    Token,
    UserLogin,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
)
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new customer account.
    Validates email uniqueness and password strength.
    """
    existing_user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    user = User(
        email=user_in.email.lower(),
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        phone=user_in.phone,
        role=UserRole.CUSTOMER,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(
    form_data: Optional[OAuth2PasswordRequestForm] = Depends(lambda: None),
    json_data: Optional[UserLogin] = Body(None),
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return JWT access token.
    Supports both standard OAuth2 form data (username=email, password) and JSON body {email, password}.
    """
    email = None
    password = None

    if form_data and form_data.username:
        email = form_data.username.lower()
        password = form_data.password
    elif json_data:
        email = json_data.email.lower()
        password = json_data.password

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required."
        )

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account."
        )

    access_token = create_access_token(subject=user.id, role=user.role.value)
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Get profile of currently authenticated user.
    """
    return current_user


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Generate password reset token for the given email.
    """
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user:
        # Don't leak whether user exists in production, but provide helpful response
        return ForgotPasswordResponse(
            message="If an account with this email exists, a password reset link has been generated."
        )

    # Invalidate previous unused tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.is_used == False
    ).update({"is_used": True})

    # Generate secure random token
    raw_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)

    reset_token_record = PasswordResetToken(
        user_id=user.id,
        token=raw_token,
        expires_at=expires_at,
        is_used=False
    )
    db.add(reset_token_record)
    db.commit()

    return ForgotPasswordResponse(
        message="Password reset token generated successfully. In production, this would be emailed.",
        reset_token=raw_token
    )


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Reset user password using valid, unexpired reset token.
    """
    token_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == req.token,
        PasswordResetToken.is_used == False
    ).first()

    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token."
        )

    now = datetime.now(timezone.utc)
    if token_record.expires_at.replace(tzinfo=timezone.utc) if token_record.expires_at.tzinfo is None else token_record.expires_at < now:
        token_record.is_used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired."
        )

    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User associated with token not found."
        )

    user.hashed_password = get_password_hash(req.new_password)
    token_record.is_used = True
    db.commit()

    return {"message": "Password has been successfully reset. You may now log in with your new password."}
