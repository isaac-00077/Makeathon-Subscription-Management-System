from decimal import Decimal
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.tax import Tax


class TaxService:
    @staticmethod
    def get_tax_by_id(db: Session, tax_id: int) -> Optional[Tax]:
        return db.query(Tax).filter(Tax.id == tax_id, Tax.is_active == True).first()

    @staticmethod
    def get_all_active_taxes(db: Session) -> List[Tax]:
        return db.query(Tax).filter(Tax.is_active == True).all()

    @staticmethod
    def calculate_line_item_tax(amount: Decimal, tax_rate: Decimal) -> Decimal:
        """
        Calculate tax amount for a line item given its taxable amount and tax percentage rate.
        Returns rounded tax to 2 decimal places.
        """
        if tax_rate <= Decimal("0.00") or amount <= Decimal("0.00"):
            return Decimal("0.00")
        tax_amount = (amount * tax_rate) / Decimal("100.00")
        return round(tax_amount, 2)
