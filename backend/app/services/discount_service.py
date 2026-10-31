from datetime import date
from decimal import Decimal
from typing import Optional, Tuple, List
from sqlalchemy.orm import Session

from app.models.discount import Discount, DiscountType


class DiscountService:
    @staticmethod
    def validate_and_calculate_discount(
        db: Session,
        code: str,
        subtotal: Decimal,
        quantity: int = 1,
        product_ids: Optional[List[int]] = None
    ) -> Tuple[bool, str, Optional[Discount], Decimal]:
        """
        Validates discount rules and calculates the eligible discount amount.
        Returns: (is_valid, message, discount_obj, calculated_discount_amount)
        """
        clean_code = code.strip().upper()
        discount = db.query(Discount).filter(Discount.code == clean_code).first()

        if not discount:
            return False, "Invalid discount code.", None, Decimal("0.00")

        if not discount.is_active:
            return False, "This discount code is inactive.", None, Decimal("0.00")

        today = date.today()
        if discount.start_date > today:
            return False, "This discount promotion has not started yet.", None, Decimal("0.00")

        if discount.end_date and discount.end_date < today:
            return False, "This discount code has expired.", None, Decimal("0.00")

        if discount.current_uses >= discount.max_uses:
            return False, "This discount code has reached its maximum usage limit.", None, Decimal("0.00")

        if subtotal < discount.min_purchase:
            return False, f"Minimum purchase amount of ₹{discount.min_purchase:.2f} is required.", None, Decimal("0.00")

        if quantity < discount.min_quantity:
            return False, f"Minimum quantity of {discount.min_quantity} items required.", None, Decimal("0.00")

        # Check product-level restrictions if not subscription-wide
        if not discount.is_subscription_wide and discount.applicable_products and product_ids:
            allowed_pids = {p.id for p in discount.applicable_products}
            if not any(pid in allowed_pids for pid in product_ids):
                return False, "This discount code does not apply to the selected products.", None, Decimal("0.00")

        # Calculate discount amount
        if discount.discount_type == DiscountType.PERCENTAGE:
            calc_amount = (subtotal * discount.value) / Decimal("100.00")
        else:
            calc_amount = discount.value

        # Discount cannot exceed subtotal
        calc_amount = min(calc_amount, subtotal)
        calc_amount = round(calc_amount, 2)

        return True, "Discount applied successfully.", discount, calc_amount

    @staticmethod
    def increment_discount_usage(db: Session, discount_id: int):
        discount = db.query(Discount).filter(Discount.id == discount_id).first()
        if discount:
            discount.current_uses += 1
            if discount.current_uses >= discount.max_uses:
                discount.is_active = False
            db.commit()
