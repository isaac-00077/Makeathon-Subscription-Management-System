from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.subscription import Subscription, SubscriptionItem, SubscriptionStatus
from app.models.user import User, UserRole
from app.models.plan import Plan, BillingFrequency
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionUpdate,
    SubscriptionResponse,
    SubscriptionItemResponse,
    SubscriptionActionRequest,
)
from app.services.subscription_service import SubscriptionService
from app.api.deps import require_admin, require_staff_or_admin, get_current_user

router = APIRouter()


def enrich_subscription_out(s: Subscription) -> SubscriptionResponse:
    items_out = []
    tot = Decimal("0.00")
    for item in s.items:
        tot += item.amount
        item_resp = SubscriptionItemResponse(
            id=item.id,
            subscription_id=item.subscription_id,
            product_id=item.product_id,
            product_variant_id=item.product_variant_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            tax_id=item.tax_id,
            discount_id=item.discount_id,
            amount=item.amount,
            product_name=item.product.name if item.product else f"Product #{item.product_id}",
            variant_name=item.variant.name if item.variant else "Standard Edition",
        )
        items_out.append(item_resp)

    out = SubscriptionResponse(
        id=s.id,
        subscription_number=s.subscription_number,
        customer_id=s.customer_id,
        plan_id=s.plan_id,
        status=s.status,
        start_date=s.start_date,
        expiry_date=s.expiry_date,
        next_billing_date=s.next_billing_date,
        last_billed_date=s.last_billed_date,
        payment_terms=s.payment_terms,
        auto_renew=s.auto_renew,
        notes=s.notes,
        history=s.history or [],
        created_at=s.created_at,
        updated_at=s.updated_at,
        customer_name=s.customer.full_name if s.customer else f"Customer #{s.customer_id}",
        customer_email=s.customer.email if s.customer else "",
        customer_company=getattr(s.customer, "company_name", ""),
        plan_name=s.plan.name if s.plan else "Standard Plan",
        billing_frequency=s.plan.billing_frequency.value if s.plan else "monthly",
        items=items_out,
        total_amount=tot,
    )
    return out


@router.get("", response_model=List[SubscriptionResponse])
def get_subscriptions(
    search: Optional[str] = None,
    status: Optional[str] = None,
    customerId: Optional[int] = None,
    customerEmail: Optional[str] = None,
    planId: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve subscriptions with isolation:
    - Customers see only their own subscriptions.
    - Staff and Admins see all subscriptions and can filter.
    """
    query = db.query(Subscription)

    if current_user.role == UserRole.CUSTOMER:
        query = query.filter(Subscription.customer_id == current_user.id)
    else:
        if customerId:
            query = query.filter(Subscription.customer_id == customerId)
        if customerEmail:
            query = query.join(Subscription.customer).filter(User.email.ilike(customerEmail.strip()))
        if planId:
            query = query.filter(Subscription.plan_id == planId)

    if status and status != "all":
        query = query.filter(Subscription.status == status.lower())

    if search:
        s = f"%{search.strip()}%"
        query = query.join(Subscription.customer).outerjoin(Subscription.plan).filter(
            or_(
                Subscription.subscription_number.ilike(s),
                User.full_name.ilike(s),
                User.email.ilike(s),
                Plan.name.ilike(s),
            )
        )

    subscriptions = query.order_by(Subscription.id.desc()).all()
    return [enrich_subscription_out(sub) for sub in subscriptions]


@router.post("", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
def create_subscription_endpoint(
    sub_in: SubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    """Create a subscription manually (Staff or Admin)."""
    raw_customer_id = sub_in.customer_id or sub_in.customerId
    if not raw_customer_id:
        raise HTTPException(status_code=400, detail="Customer ID is required.")

    try:
        target_customer_id = int(raw_customer_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail=f"Invalid customer ID: {raw_customer_id}")

    customer = db.query(User).filter(User.id == target_customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer #{target_customer_id} not found.")

    raw_plan_id = sub_in.plan_id or sub_in.planId
    if not raw_plan_id:
        first_plan = db.query(Plan).filter(Plan.is_active == True).first()
        if not first_plan:
            raise HTTPException(status_code=400, detail="No active plan available.")
        target_plan_id = first_plan.id
    else:
        try:
            target_plan_id = int(raw_plan_id)
        except (ValueError, TypeError):
            first_plan = db.query(Plan).filter(Plan.is_active == True).first()
            target_plan_id = first_plan.id if first_plan else 1

    plan = db.query(Plan).filter(Plan.id == target_plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail=f"Plan #{target_plan_id} not found.")

    # Items from either sub_in.items or sub_in.productLines
    items_payload = []
    if sub_in.items:
        items_payload = [i.model_dump() for i in sub_in.items]
    elif sub_in.productLines:
        items_payload = sub_in.productLines
    else:
        # Default to plan's associated product
        items_payload = [{
            "product_id": plan.product_id,
            "quantity": sub_in.quantity or 1,
            "unit_price": plan.price,
        }]

    start_d = sub_in.start_date or sub_in.startDate
    expiry_d = sub_in.expiry_date or sub_in.expiryDate
    pay_terms = sub_in.payment_terms or sub_in.paymentMethod or "Razorpay / Card"
    auto_r = sub_in.auto_renew if sub_in.auto_renew is not None else (sub_in.autoRenew if sub_in.autoRenew is not None else True)

    try:
        created = SubscriptionService.create_subscription(
            db=db,
            customer_id=target_customer_id,
            plan_id=target_plan_id,
            items_data=items_payload,
            start_date=start_d,
            expiry_date=expiry_d,
            payment_terms=pay_terms,
            auto_renew=auto_r,
            notes=sub_in.notes,
            actor_name=current_user.full_name
        )
        return enrich_subscription_out(created)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
def get_subscription_by_id(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    if current_user.role == UserRole.CUSTOMER and sub.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied: Cannot view another customer's subscription.")

    return enrich_subscription_out(sub)


@router.put("/{subscription_id}", response_model=SubscriptionResponse)
def update_subscription(
    subscription_id: int,
    sub_in: SubscriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    if sub_in.status:
        sub.status = sub_in.status
    if sub_in.start_date:
        sub.start_date = sub_in.start_date
    if sub_in.expiry_date:
        sub.expiry_date = sub_in.expiry_date
    if sub_in.next_billing_date:
        sub.next_billing_date = sub_in.next_billing_date
    if sub_in.payment_terms:
        sub.payment_terms = sub_in.payment_terms
    if sub_in.auto_renew is not None:
        sub.auto_renew = sub_in.auto_renew
    if sub_in.notes is not None:
        sub.notes = sub_in.notes
    if sub_in.history is not None:
        sub.history = sub_in.history

    db.commit()
    db.refresh(sub)
    return enrich_subscription_out(sub)


# ----------------------------------------------------
# Lifecycle Operations: Activate / Pause / Resume / Renew / Close
# ----------------------------------------------------
@router.post("/{subscription_id}/activate", response_model=SubscriptionResponse)
def activate_subscription_endpoint(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    try:
        activated = SubscriptionService.activate_subscription(db, sub, actor=current_user.full_name)
        return enrich_subscription_out(activated)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{subscription_id}/pause", response_model=SubscriptionResponse)
def pause_subscription_endpoint(
    subscription_id: int,
    action_in: SubscriptionActionRequest = SubscriptionActionRequest(reason="Paused by user"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    if current_user.role == UserRole.CUSTOMER and sub.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    try:
        paused = SubscriptionService.pause_subscription(
            db, sub,
            actor=current_user.full_name,
            reason=action_in.reason or "Paused by user"
        )
        return enrich_subscription_out(paused)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{subscription_id}/resume", response_model=SubscriptionResponse)
def resume_subscription_endpoint(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    if current_user.role == UserRole.CUSTOMER and sub.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    try:
        resumed = SubscriptionService.resume_subscription(db, sub, actor=current_user.full_name)
        return enrich_subscription_out(resumed)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{subscription_id}/renew", response_model=SubscriptionResponse)
def renew_subscription_endpoint(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    if current_user.role == UserRole.CUSTOMER and sub.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    try:
        renewed = SubscriptionService.renew_subscription(db, sub, actor=current_user.full_name)
        return enrich_subscription_out(renewed)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{subscription_id}/close", response_model=SubscriptionResponse)
def close_subscription_endpoint(
    subscription_id: int,
    action_in: SubscriptionActionRequest = SubscriptionActionRequest(reason="Term completion"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    try:
        closed = SubscriptionService.close_subscription(
            db, sub,
            actor=current_user.full_name,
            reason=action_in.reason or "Closed by admin/staff"
        )
        return enrich_subscription_out(closed)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
