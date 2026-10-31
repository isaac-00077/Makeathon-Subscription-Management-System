from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.product import Product
from app.models.plan import Plan, BillingFrequency
from app.schemas.plan import (
    PlanCreate,
    PlanUpdate,
    PlanResponse,
    PlanDetailResponse,
)
from app.api.deps import require_admin

router = APIRouter()


@router.get("/", response_model=List[PlanDetailResponse])
def list_plans(
    product_id: Optional[int] = Query(None, description="Filter by associated product ID"),
    billing_frequency: Optional[BillingFrequency] = Query(None, description="Filter by billing frequency"),
    is_active: Optional[bool] = Query(True, description="Filter by active status (defaults to True)"),
    search: Optional[str] = Query(None, description="Search plans by name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    List all subscription plans with filters.
    Accessible to all users and visitors.
    """
    query = db.query(Plan)

    if is_active is not None:
        query = query.filter(Plan.is_active == is_active)

    if product_id is not None:
        query = query.filter(Plan.product_id == product_id)

    if billing_frequency is not None:
        query = query.filter(Plan.billing_frequency == billing_frequency)

    if search:
        query = query.filter(Plan.name.ilike(f"%{search}%"))

    plans = query.order_by(Plan.name.asc()).offset(skip).limit(limit).all()
    return plans


@router.post("/", response_model=PlanDetailResponse, status_code=status.HTTP_201_CREATED)
def create_plan(
    plan_in: PlanCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    """
    Create a new subscription plan. Admin only.
    """
    # Verify associated product exists
    product = db.query(Product).filter(Product.id == plan_in.product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {plan_in.product_id} not found."
        )

    plan = Plan(
        name=plan_in.name,
        description=plan_in.description,
        product_id=plan_in.product_id,
        price=plan_in.price,
        billing_frequency=plan_in.billing_frequency,
        minimum_quantity=plan_in.minimum_quantity,
        available_from=plan_in.available_from,
        available_until=plan_in.available_until,
        auto_close=plan_in.auto_close,
        allow_early_closure=plan_in.allow_early_closure,
        allow_pause=plan_in.allow_pause,
        allow_renewal=plan_in.allow_renewal,
        is_active=plan_in.is_active
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/{plan_id}", response_model=PlanDetailResponse)
def get_plan(
    plan_id: int,
    db: Session = Depends(get_db)
):
    """
    Get detailed information for a specific subscription plan.
    """
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return plan


@router.put("/{plan_id}", response_model=PlanDetailResponse)
def update_plan(
    plan_id: int,
    plan_in: PlanUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    """
    Update an existing subscription plan. Admin only.
    """
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    if plan_in.product_id is not None:
        product = db.query(Product).filter(Product.id == plan_in.product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {plan_in.product_id} not found."
            )

    update_data = plan_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(plan, field, value)

    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/{plan_id}", status_code=status.HTTP_200_OK)
def archive_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    """
    Archive / soft-delete a plan. Admin only.
    """
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    plan.is_active = False
    db.commit()
    return {"message": f"Plan '{plan.name}' archived successfully."}
