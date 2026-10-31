from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator, model_validator, computed_field

from app.models.user import UserRole
from app.core.security import validate_password_strength


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=50)

    @model_validator(mode="before")
    @classmethod
    def populate_full_name(cls, data: dict):
        if isinstance(data, dict):
            if not data.get("full_name") and data.get("name"):
                data["full_name"] = data["name"]
            elif not data.get("name") and data.get("full_name"):
                data["name"] = data["full_name"]
        return data


class UserCreate(UserBase):
    full_name: str = Field(..., min_length=2, max_length=150)
    password: str = Field(..., description="Password must be >8 chars, with at least 1 uppercase, 1 lowercase, and 1 special character")

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        valid, msg = validate_password_strength(v)
        if not valid:
            raise ValueError(msg)
        return v


class CustomerCreate(BaseModel):
    name: Optional[str] = None
    full_name: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    password: Optional[str] = "CustomerPass123!"

    @model_validator(mode="before")
    @classmethod
    def populate_name(cls, data: dict):
        if isinstance(data, dict):
            if not data.get("full_name") and data.get("name"):
                data["full_name"] = data["name"]
        return data


class StaffCreate(UserCreate):
    """Schema for Admin creating a staff account."""
    pass


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    name: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=50)
    company: Optional[str] = None
    is_active: Optional[bool] = None

    @model_validator(mode="before")
    @classmethod
    def populate_name(cls, data: dict):
        if isinstance(data, dict):
            if not data.get("full_name") and data.get("name"):
                data["full_name"] = data["name"]
        return data


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    def name(self) -> str:
        return self.full_name

    @computed_field
    def company(self) -> str:
        return "Brightloop Client"

    @computed_field
    def status(self) -> str:
        return "active" if self.is_active else "inactive"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

    @computed_field
    def token(self) -> str:
        return self.access_token


class TokenData(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    reset_token: Optional[str] = None  # Returned for development/demo ease


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        valid, msg = validate_password_strength(v)
        if not valid:
            raise ValueError(msg)
        return v
