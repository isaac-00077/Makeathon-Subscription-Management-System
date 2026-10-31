from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.tax import Tax
from app.models.user import User
from app.schemas.tax import TaxCreate, TaxUpdate, TaxOut
from app.api.deps import require_admin, require_staff_or_admin, get_current_user

router = APIRouter()


@router.get("", response_model=List[TaxOut])
def get_taxes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all active tax configurations."""
    return db.query(Tax).order_by(Tax.id.asc()).all()


@router.post("", response_model=TaxOut, status_code=status.HTTP_201_CREATED)
def create_tax(
    tax_in: TaxCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create a new tax rule (Admin only)."""
    tax = Tax(
        name=tax_in.name,
        rate=tax_in.rate,
        description=tax_in.description,
        is_active=tax_in.is_active
    )
    db.add(tax)
    db.commit()
    db.refresh(tax)
    return tax


@router.get("/{tax_id}", response_model=TaxOut)
def get_tax(
    tax_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tax = db.query(Tax).filter(Tax.id == tax_id).first()
    if not tax:
        raise HTTPException(status_code=404, detail="Tax rate not found.")
    return tax


@router.put("/{tax_id}", response_model=TaxOut)
def update_tax(
    tax_id: int,
    tax_in: TaxUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update tax rule (Admin only)."""
    tax = db.query(Tax).filter(Tax.id == tax_id).first()
    if not tax:
        raise HTTPException(status_code=404, detail="Tax rate not found.")

    update_data = tax_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(tax, field, val)

    db.commit()
    db.refresh(tax)
    return tax


@router.delete("/{tax_id}", status_code=status.HTTP_200_OK)
def delete_tax(
    tax_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Deactivate or delete a tax rule (Admin only)."""
    tax = db.query(Tax).filter(Tax.id == tax_id).first()
    if not tax:
        raise HTTPException(status_code=404, detail="Tax rate not found.")

    tax.is_active = False
    db.commit()
    return {"success": True, "message": f"Tax rule '{tax.name}' deactivated successfully."}
