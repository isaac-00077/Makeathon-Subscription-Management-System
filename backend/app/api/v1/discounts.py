from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.discount import Discount, DiscountType
from app.models.product import Product
from app.models.user import User
from app.schemas.discount import (
    DiscountCreate, DiscountUpdate, DiscountOut,
    DiscountValidateRequest, DiscountValidateResponse
)
from app.services.discount_service import DiscountService
from app.api.deps import require_admin, require_staff_or_admin, get_current_user

router = APIRouter()


@router.get("", response_model=List[DiscountOut])
def get_discounts(
    search: Optional[str] = None,
    type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    """Retrieve discount rules with optional search and filters."""
    query = db.query(Discount)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter((Discount.code.ilike(s)) | (Discount.name.ilike(s)))

    if type and type != "all":
        query = query.filter(Discount.discount_type == type)

    if status and status != "all":
        is_active = (status == "active")
        query = query.filter(Discount.is_active == is_active)

    discounts = query.order_by(Discount.id.desc()).all()
    
    # Enrich with applicable_product_ids
    results = []
    for d in discounts:
        out = DiscountOut.model_validate(d)
        out.applicable_product_ids = [p.id for p in d.applicable_products]
        results.append(out)
    return results


@router.post("", response_model=DiscountOut, status_code=status.HTTP_201_CREATED)
def create_discount(
    discount_in: DiscountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create a new discount rule (Admin only)."""
    clean_code = discount_in.code.strip().upper()
    existing = db.query(Discount).filter(Discount.code == clean_code).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Discount code '{clean_code}' already exists."
        )

    discount = Discount(
        code=clean_code,
        name=discount_in.name,
        discount_type=discount_in.discount_type,
        value=discount_in.value,
        min_purchase=discount_in.min_purchase,
        min_quantity=discount_in.min_quantity,
        is_subscription_wide=discount_in.is_subscription_wide,
        start_date=discount_in.start_date,
        end_date=discount_in.end_date,
        max_uses=discount_in.max_uses,
        is_active=discount_in.is_active
    )

    if discount_in.applicable_product_ids:
        products = db.query(Product).filter(Product.id.in_(discount_in.applicable_product_ids)).all()
        discount.applicable_products = products

    db.add(discount)
    db.commit()
    db.refresh(discount)

    out = DiscountOut.model_validate(discount)
    out.applicable_product_ids = [p.id for p in discount.applicable_products]
    return out


@router.post("/validate", response_model=DiscountValidateResponse)
def validate_discount(
    payload: DiscountValidateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Validate discount coupon and calculate discount amount."""
    is_valid, message, discount, calc_amount = DiscountService.validate_and_calculate_discount(
        db=db,
        code=payload.code,
        subtotal=payload.subtotal,
        quantity=payload.quantity
    )

    if not is_valid:
        raise HTTPException(status_code=400, detail=message)

    out_discount = None
    if discount:
        out_discount = DiscountOut.model_validate(discount)
        out_discount.applicable_product_ids = [p.id for p in discount.applicable_products]

    return DiscountValidateResponse(
        valid=True,
        calculated_amount=calc_amount,
        discount=out_discount,
        message=message
    )


@router.get("/{discount_id}", response_model=DiscountOut)
def get_discount_by_id(
    discount_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    discount = db.query(Discount).filter(Discount.id == discount_id).first()
    if not discount:
        raise HTTPException(status_code=404, detail="Discount not found.")

    out = DiscountOut.model_validate(discount)
    out.applicable_product_ids = [p.id for p in discount.applicable_products]
    return out


@router.put("/{discount_id}", response_model=DiscountOut)
def update_discount(
    discount_id: int,
    discount_in: DiscountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    discount = db.query(Discount).filter(Discount.id == discount_id).first()
    if not discount:
        raise HTTPException(status_code=404, detail="Discount not found.")

    data = discount_in.model_dump(exclude_unset=True)
    if "code" in data:
        data["code"] = data["code"].strip().upper()

    prod_ids = data.pop("applicable_product_ids", None)
    if prod_ids is not None:
        discount.applicable_products = db.query(Product).filter(Product.id.in_(prod_ids)).all()

    for k, v in data.items():
        setattr(discount, k, v)

    db.commit()
    db.refresh(discount)

    out = DiscountOut.model_validate(discount)
    out.applicable_product_ids = [p.id for p in discount.applicable_products]
    return out


@router.delete("/{discount_id}")
def delete_discount(
    discount_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    discount = db.query(Discount).filter(Discount.id == discount_id).first()
    if not discount:
        raise HTTPException(status_code=404, detail="Discount not found.")

    db.delete(discount)
    db.commit()
    return {"success": True, "message": "Discount deleted successfully."}
