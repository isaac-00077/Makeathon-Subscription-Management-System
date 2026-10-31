from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.schemas.user import UserResponse, StaffCreate, UserUpdate
from app.api.deps import get_current_user, require_admin, require_staff_or_admin

router = APIRouter()


@router.post("/staff", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_staff_user(
    staff_in: StaffCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Create a staff account. Only accessible by administrators.
    """
    existing_user = db.query(User).filter(User.email == staff_in.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    staff_user = User(
        email=staff_in.email.lower(),
        hashed_password=get_password_hash(staff_in.password),
        full_name=staff_in.full_name,
        phone=staff_in.phone,
        role=UserRole.STAFF,
        is_active=True
    )
    db.add(staff_user)
    db.commit()
    db.refresh(staff_user)
    return staff_user


@router.get("/", response_model=List[UserResponse])
def list_users(
    role: Optional[UserRole] = Query(None, description="Filter by user role"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    """
    List users with optional filtering.
    Staff can only view Customer users.
    Admins can view all roles.
    """
    query = db.query(User)

    if current_user.role == UserRole.STAFF:
        query = query.filter(User.role == UserRole.CUSTOMER)
    elif role is not None:
        query = query.filter(User.role == role)

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_filter),
                User.email.ilike(search_filter)
            )
        )

    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return users


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get user details by ID.
    Customers can only view their own record.
    Staff can view customers.
    Admins can view anyone.
    """
    if current_user.role == UserRole.CUSTOMER and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this user."
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if current_user.role == UserRole.STAFF and user.role != UserRole.CUSTOMER and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return user


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update user profile.
    Customers can only update their own profile and cannot change their active status.
    Admins can update any user and status.
    """
    if current_user.role == UserRole.CUSTOMER and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to update this user."
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = user_in.model_dump(exclude_unset=True)

    # Customers cannot change is_active
    if current_user.role != UserRole.ADMIN and "is_active" in update_data:
        del update_data["is_active"]

    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user
