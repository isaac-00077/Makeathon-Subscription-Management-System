from typing import List, Optional, Any
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.quotation import (
    Quotation, QuotationItem, QuotationStatus,
    QuotationTemplate, QuotationTemplateItem
)
from app.models.user import User, UserRole
from app.schemas.quotation import (
    QuotationCreate,
    QuotationUpdate,
    QuotationResponse,
    QuotationItemResponse,
    QuotationConvertToSubOptions,
    QuotationConvertToSubResponse,
    QuotationTemplateCreate,
    QuotationTemplateUpdate,
    QuotationTemplateResponse,
    QuotationTemplateItemResponse,
)
from app.services.quotation_service import QuotationService
from app.api.deps import require_admin, require_staff_or_admin, get_current_user

router = APIRouter()


def enrich_quotation_out(q: Quotation) -> QuotationResponse:
    items_out = []
    for item in q.items:
        item_resp = QuotationItemResponse(
            id=item.id,
            quotation_id=item.quotation_id,
            product_id=item.product_id,
            product_variant_id=item.product_variant_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            amount=item.amount,
            product_name=item.product.name if item.product else f"Product #{item.product_id}",
            variant_name=item.variant.name if item.variant else "Standard Edition",
        )
        items_out.append(item_resp)

    out = QuotationResponse(
        id=q.id,
        quotation_number=q.quotation_number,
        customer_id=q.customer_id,
        plan_id=q.plan_id,
        status=q.status,
        template_name=q.template_name or "Standard Template",
        valid_until=q.valid_until,
        subtotal=q.subtotal,
        tax_rate=q.tax_rate,
        tax_amount=q.tax_amount,
        discount_type=q.discount_type or "percentage",
        discount_value=q.discount_value,
        discount_amount=q.discount_amount,
        total_amount=q.total_amount,
        converted_subscription_id=q.converted_subscription_id,
        notes=q.notes,
        terms=q.terms,
        created_at=q.created_at,
        updated_at=q.updated_at,
        customer_name=q.customer.full_name if q.customer else f"Customer #{q.customer_id}",
        customer_email=q.customer.email if q.customer else "",
        customer_company=getattr(q.customer, "company_name", ""),
        items=items_out,
    )
    return out


# ----------------------------------------------------
# Quotation Templates
# ----------------------------------------------------
@router.get("/templates", response_model=List[QuotationTemplateResponse])
def list_quotation_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    templates = db.query(QuotationTemplate).filter(QuotationTemplate.is_active == True).all()
    results = []
    for t in templates:
        items = [
            QuotationTemplateItemResponse(
                id=i.id,
                template_id=i.template_id,
                product_id=i.product_id,
                product_variant_id=i.product_variant_id,
                quantity=i.quantity,
                unit_price=i.unit_price,
                product_name=i.product.name if i.product else f"Product #{i.product_id}",
                variant_name=i.variant.name if i.variant else "Standard Edition",
            )
            for i in t.items
        ]
        results.append(QuotationTemplateResponse(
            id=t.id,
            name=t.name,
            description=t.description,
            plan_id=t.plan_id,
            validity_days=t.validity_days,
            terms=t.terms,
            is_active=t.is_active,
            created_at=t.created_at,
            updated_at=t.updated_at,
            items=items,
        ))
    return results


@router.post("/templates", response_model=QuotationTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_quotation_template(
    template_in: QuotationTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    template = QuotationTemplate(
        name=template_in.name,
        description=template_in.description,
        plan_id=template_in.plan_id,
        validity_days=template_in.validity_days,
        terms=template_in.terms,
        is_active=template_in.is_active,
    )
    db.add(template)
    db.flush()

    for item in template_in.items:
        t_item = QuotationTemplateItem(
            template_id=template.id,
            product_id=item.product_id,
            product_variant_id=item.product_variant_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
        )
        db.add(t_item)

    db.commit()
    db.refresh(template)
    return template


# ----------------------------------------------------
# Quotations List & Create
# ----------------------------------------------------
@router.get("", response_model=List[QuotationResponse])
def get_quotations(
    search: Optional[str] = None,
    status: Optional[str] = None,
    customerId: Optional[int] = None,
    customerEmail: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List quotations with role-based isolation:
    - Customers can only view their own quotations.
    - Staff and Admins can view all quotations with search and filters.
    """
    query = db.query(Quotation)

    if current_user.role == UserRole.CUSTOMER:
        query = query.filter(Quotation.customer_id == current_user.id)
    else:
        if customerId:
            query = query.filter(Quotation.customer_id == customerId)
        if customerEmail:
            query = query.join(Quotation.customer).filter(User.email.ilike(customerEmail.strip()))

    if status and status != "all":
        query = query.filter(Quotation.status == status.lower())

    if search:
        s = f"%{search.strip()}%"
        query = query.join(Quotation.customer).filter(
            or_(
                Quotation.quotation_number.ilike(s),
                User.full_name.ilike(s),
                User.email.ilike(s)
            )
        )

    quotations = query.order_by(Quotation.id.desc()).all()
    return [enrich_quotation_out(q) for q in quotations]


@router.post("", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
def create_quotation_endpoint(
    quotation_in: QuotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    """Create a new quotation with dynamic line-item pricing (Staff or Admin)."""
    raw_customer_id = quotation_in.customer_id or quotation_in.customerId
    if not raw_customer_id:
        raise HTTPException(status_code=400, detail="Customer ID is required.")

    try:
        target_customer_id = int(raw_customer_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail=f"Invalid customer ID: {raw_customer_id}")

    customer = db.query(User).filter(User.id == target_customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer #{target_customer_id} not found.")

    valid_until = quotation_in.valid_until or quotation_in.validityDate
    plan_id = quotation_in.plan_id or quotation_in.planId
    if plan_id and str(plan_id).isdigit():
        plan_id = int(plan_id)
    else:
        plan_id = None

    items_payload = [item.model_dump() for item in quotation_in.items]

    disc_type = quotation_in.discount_type or quotation_in.discountType or "percentage"
    disc_val = quotation_in.discount_value if quotation_in.discount_value is not None else (quotation_in.discountValue or Decimal("0.00"))
    tax_r = quotation_in.tax_rate if quotation_in.tax_rate is not None else (quotation_in.taxRate or Decimal("0.00"))

    created_status = QuotationStatus.DRAFT
    if quotation_in.status:
        try:
            created_status = QuotationStatus(quotation_in.status.lower())
        except ValueError:
            created_status = QuotationStatus.DRAFT

    created_quotation = QuotationService.create_quotation(
        db=db,
        customer_id=target_customer_id,
        items_data=items_payload,
        valid_until=valid_until,
        plan_id=plan_id,
        template_name=quotation_in.template or quotation_in.template_name or "Standard Template",
        discount_type=disc_type,
        discount_value=disc_val,
        tax_rate=tax_r,
        notes=quotation_in.notes,
        terms=quotation_in.terms,
        status=created_status,
    )

    return enrich_quotation_out(created_quotation)


# ----------------------------------------------------
# Single Quotation Operations
# ----------------------------------------------------
@router.get("/{quotation_id}", response_model=QuotationResponse)
def get_quotation_by_id(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found.")

    if current_user.role == UserRole.CUSTOMER and quotation.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied: Cannot view another customer's quotation.")

    return enrich_quotation_out(quotation)


@router.put("/{quotation_id}", response_model=QuotationResponse)
def update_quotation_endpoint(
    quotation_id: int,
    quotation_in: QuotationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found.")

    update_dict = quotation_in.model_dump(exclude_unset=True)
    try:
        updated = QuotationService.update_quotation(db, quotation, update_dict)
        return enrich_quotation_out(updated)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{quotation_id}")
def delete_quotation_endpoint(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found.")

    if quotation.status == QuotationStatus.CONVERTED:
        raise HTTPException(status_code=400, detail="Cannot delete a converted quotation.")

    db.delete(quotation)
    db.commit()
    return {"success": True, "message": f"Quotation {quotation.quotation_number} deleted successfully."}


@router.post("/{quotation_id}/send", response_model=QuotationResponse)
def send_quotation_endpoint(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found.")

    sent_quote = QuotationService.send_quotation(db, quotation)
    return enrich_quotation_out(sent_quote)


@router.post("/{quotation_id}/approve", response_model=QuotationResponse)
@router.post("/{quotation_id}/accept", response_model=QuotationResponse)
def accept_or_approve_quotation_endpoint(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marks a quotation as accepted/approved."""
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found.")

    if current_user.role == UserRole.CUSTOMER and quotation.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    accepted = QuotationService.accept_quotation(db, quotation)
    return enrich_quotation_out(accepted)


@router.post("/{quotation_id}/reject", response_model=QuotationResponse)
def reject_quotation_endpoint(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found.")

    if current_user.role == UserRole.CUSTOMER and quotation.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    rejected = QuotationService.reject_quotation(db, quotation)
    return enrich_quotation_out(rejected)


# ----------------------------------------------------
# Convert Quotation to Subscription
# ----------------------------------------------------
@router.post("/{quotation_id}/convert", response_model=QuotationConvertToSubResponse)
@router.post("/{quotation_id}/convert-to-subscription", response_model=QuotationConvertToSubResponse)
def convert_quotation_to_subscription_endpoint(
    quotation_id: int,
    options: QuotationConvertToSubOptions = QuotationConvertToSubOptions(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    """
    Converts an approved quotation into an active subscription and
    generates the corresponding initial invoice.
    Supports both /convert and /convert-to-subscription paths for frontend compatibility.
    """
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found.")

    try:
        conversion_result = QuotationService.convert_to_subscription(
            db=db,
            quotation=quotation,
            options=options.model_dump(),
            actor_name=current_user.full_name
        )

        sub_obj = conversion_result["subscription"]
        inv_obj = conversion_result["invoice"]

        # Format subscription data for response
        sub_data = {
            "id": sub_obj.id,
            "subscriptionNumber": sub_obj.subscription_number,
            "customerId": sub_obj.customer_id,
            "customerName": sub_obj.customer.full_name if sub_obj.customer else f"Customer #{sub_obj.customer_id}",
            "customerEmail": sub_obj.customer.email if sub_obj.customer else "",
            "planId": sub_obj.plan_id,
            "planName": sub_obj.plan.name if sub_obj.plan else "Standard Plan",
            "billingFrequency": sub_obj.plan.billing_frequency.capitalize() if sub_obj.plan else "Monthly",
            "status": sub_obj.status.value,
            "startDate": sub_obj.start_date.isoformat(),
            "expiryDate": sub_obj.expiry_date.isoformat() if sub_obj.expiry_date else None,
            "nextBillingDate": sub_obj.next_billing_date.isoformat() if sub_obj.next_billing_date else None,
            "paymentMethod": sub_obj.payment_terms,
            "amount": float(sum(i.amount for i in sub_obj.items)),
            "quantity": sum(i.quantity for i in sub_obj.items),
            "history": sub_obj.history or [],
        }

        inv_data = None
        if inv_obj:
            inv_data = {
                "id": inv_obj.id,
                "invoiceNumber": inv_obj.invoice_number,
                "customerId": inv_obj.customer_id,
                "subscriptionId": inv_obj.subscription_id,
                "grandTotal": float(inv_obj.grand_total),
                "balance": float(inv_obj.balance),
                "status": inv_obj.status.value,
                "issueDate": inv_obj.issue_date.isoformat(),
                "dueDate": inv_obj.due_date.isoformat(),
            }

        return QuotationConvertToSubResponse(
            subscription=sub_data,
            invoice=inv_data,
            message=conversion_result["message"]
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
