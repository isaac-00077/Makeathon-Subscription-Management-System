from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.schemas.user import UserResponse, CustomerCreate, UserUpdate
from app.api.deps import require_staff_or_admin, get_current_user

router = APIRouter()


@router.get("", response_model=List[UserResponse])
def list_customers(
    search: Optional[str] = Query(None, description="Search by name, email, or phone"),
    status: Optional[str] = Query(None, description="Filter by active/inactive"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    """List all customers (Staff or Admin)."""
    query = db.query(User).filter(User.role == UserRole.CUSTOMER)

    if status and status != "all":
        is_act = True if status.lower() == "active" else False
        query = query.filter(User.is_active == is_act)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.full_name.ilike(s),
                User.email.ilike(s),
                User.phone.ilike(s)
            )
        )

    return query.order_by(User.id.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    cust_in: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    """Create a new customer account (Staff or Admin)."""
    existing = db.query(User).filter(User.email == cust_in.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    name = cust_in.name or cust_in.full_name or "Valued Customer"
    pwd = cust_in.password or "CustomerPass123!"

    user = User(
        email=cust_in.email.lower(),
        hashed_password=get_password_hash(pwd),
        full_name=name,
        phone=cust_in.phone,
        role=UserRole.CUSTOMER,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{customer_id}", response_model=UserResponse)
def get_customer_by_id(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == UserRole.CUSTOMER and current_user.id != customer_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    user = db.query(User).filter(User.id == customer_id, User.role == UserRole.CUSTOMER).first()
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found.")
    return user


@router.put("/{customer_id}", response_model=UserResponse)
def update_customer(
    customer_id: int,
    cust_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    user = db.query(User).filter(User.id == customer_id, User.role == UserRole.CUSTOMER).first()
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found.")

    if cust_in.name or cust_in.full_name:
        user.full_name = cust_in.name or cust_in.full_name
    if cust_in.phone is not None:
        user.phone = cust_in.phone
    if cust_in.is_active is not None:
        user.is_active = cust_in.is_active

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{customer_id}")
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    user = db.query(User).filter(User.id == customer_id, User.role == UserRole.CUSTOMER).first()
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found.")

    user.is_active = False
    db.commit()
    return {"success": True, "message": f"Customer '{user.full_name}' deactivated."}
