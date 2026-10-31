from datetime import date, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.quotation import (
    Quotation, QuotationItem, QuotationStatus,
    QuotationTemplate, QuotationTemplateItem
)
from app.models.subscription import Subscription, SubscriptionItem, SubscriptionStatus
from app.models.product import Product, ProductVariant
from app.models.plan import Plan, BillingFrequency
from app.models.user import User
from app.models.tax import Tax
from app.services.invoice_service import InvoiceService


class QuotationService:
    @staticmethod
    def generate_quotation_number(db: Session) -> str:
        current_year = date.today().year
        prefix = f"QT-{current_year}-"
        
        count = db.query(func.count(Quotation.id)).filter(
            Quotation.quotation_number.like(f"{prefix}%")
        ).scalar() or 0
        
        return f"{prefix}{str(count + 1).zfill(4)}"

    @staticmethod
    def calculate_totals(
        items_data: List[Dict[str, Any]],
        discount_type: str = "percentage",
        discount_value: Decimal = Decimal("0.00"),
        tax_rate: Decimal = Decimal("0.00"),
    ) -> Dict[str, Any]:
        subtotal = Decimal("0.00")
        processed_items = []

        for item in items_data:
            qty = int(item.get("quantity") or 1)
            u_price = Decimal(str(item.get("unit_price") or item.get("unitPrice") or 0.00))
            line_amount = qty * u_price
            subtotal += line_amount

            processed_items.append({
                "product_id": item.get("product_id") or item.get("productId"),
                "product_variant_id": item.get("product_variant_id") or item.get("variantId") if str(item.get("product_variant_id") or item.get("variantId") or "").isdigit() else None,
                "quantity": qty,
                "unit_price": u_price,
                "amount": line_amount,
            })

        # Calculate discount
        if discount_type == "percentage":
            discount_amount = round((subtotal * discount_value) / Decimal("100.00"), 2)
        else:  # fixed
            discount_amount = min(discount_value, subtotal)

        taxable_amount = max(Decimal("0.00"), subtotal - discount_amount)
        tax_amount = round((taxable_amount * tax_rate) / Decimal("100.00"), 2)
        grand_total = taxable_amount + tax_amount

        return {
            "subtotal": subtotal,
            "discount_amount": discount_amount,
            "tax_amount": tax_amount,
            "grand_total": grand_total,
            "items": processed_items,
        }

    @staticmethod
    def create_quotation(
        db: Session,
        customer_id: int,
        items_data: List[Dict[str, Any]],
        valid_until: Optional[date] = None,
        plan_id: Optional[int] = None,
        template_name: Optional[str] = "Standard Template",
        discount_type: str = "percentage",
        discount_value: Decimal = Decimal("0.00"),
        tax_rate: Decimal = Decimal("0.00"),
        notes: Optional[str] = None,
        terms: Optional[str] = None,
        status: QuotationStatus = QuotationStatus.DRAFT,
    ) -> Quotation:
        if not valid_until:
            valid_until = date.today() + timedelta(days=30)

        calc = QuotationService.calculate_totals(
            items_data=items_data,
            discount_type=discount_type,
            discount_value=discount_value,
            tax_rate=tax_rate,
        )

        quotation_number = QuotationService.generate_quotation_number(db)

        quotation = Quotation(
            quotation_number=quotation_number,
            customer_id=customer_id,
            plan_id=plan_id,
            status=status,
            template_name=template_name,
            valid_until=valid_until,
            subtotal=calc["subtotal"],
            tax_rate=tax_rate,
            tax_amount=calc["tax_amount"],
            discount_type=discount_type,
            discount_value=discount_value,
            discount_amount=calc["discount_amount"],
            total_amount=calc["grand_total"],
            notes=notes,
            terms=terms,
        )

        db.add(quotation)
        db.flush()

        for itm in calc["items"]:
            q_item = QuotationItem(
                quotation_id=quotation.id,
                product_id=itm["product_id"],
                product_variant_id=itm["product_variant_id"],
                quantity=itm["quantity"],
                unit_price=itm["unit_price"],
                amount=itm["amount"],
            )
            db.add(q_item)

        db.commit()
        db.refresh(quotation)
        return quotation

    @staticmethod
    def update_quotation(
        db: Session,
        quotation: Quotation,
        update_data: Dict[str, Any]
    ) -> Quotation:
        if quotation.status == QuotationStatus.CONVERTED:
            raise ValueError("Cannot modify an already converted quotation.")

        if "items" in update_data and update_data["items"] is not None:
            # Recompute totals
            d_type = update_data.get("discount_type", quotation.discount_type) or "percentage"
            d_val = update_data.get("discount_value", quotation.discount_value) or Decimal("0.00")
            t_rate = update_data.get("tax_rate", quotation.tax_rate) or Decimal("0.00")

            calc = QuotationService.calculate_totals(
                items_data=update_data["items"],
                discount_type=d_type,
                discount_value=d_val,
                tax_rate=t_rate,
            )

            # Clear old items
            for old_item in list(quotation.items):
                db.delete(old_item)
            db.flush()

            # Insert new items
            for itm in calc["items"]:
                q_item = QuotationItem(
                    quotation_id=quotation.id,
                    product_id=itm["product_id"],
                    product_variant_id=itm["product_variant_id"],
                    quantity=itm["quantity"],
                    unit_price=itm["unit_price"],
                    amount=itm["amount"],
                )
                db.add(q_item)

            quotation.subtotal = calc["subtotal"]
            quotation.tax_amount = calc["tax_amount"]
            quotation.discount_amount = calc["discount_amount"]
            quotation.total_amount = calc["grand_total"]

        if "valid_until" in update_data and update_data["valid_until"]:
            quotation.valid_until = update_data["valid_until"]
        if "template" in update_data and update_data["template"]:
            quotation.template_name = update_data["template"]
        if "notes" in update_data:
            quotation.notes = update_data["notes"]
        if "terms" in update_data:
            quotation.terms = update_data["terms"]
        if "status" in update_data and update_data["status"]:
            st = update_data["status"]
            if isinstance(st, str):
                st = QuotationStatus(st.lower())
            quotation.status = st

        db.commit()
        db.refresh(quotation)
        return quotation

    @staticmethod
    def send_quotation(db: Session, quotation: Quotation) -> Quotation:
        quotation.status = QuotationStatus.SENT
        db.commit()
        db.refresh(quotation)
        return quotation

    @staticmethod
    def accept_quotation(db: Session, quotation: Quotation) -> Quotation:
        quotation.status = QuotationStatus.ACCEPTED
        db.commit()
        db.refresh(quotation)
        return quotation

    @staticmethod
    def reject_quotation(db: Session, quotation: Quotation) -> Quotation:
        quotation.status = QuotationStatus.REJECTED
        db.commit()
        db.refresh(quotation)
        return quotation

    @staticmethod
    def convert_to_subscription(
        db: Session,
        quotation: Quotation,
        options: Dict[str, Any],
        actor_name: str = "Operational Staff"
    ) -> Dict[str, Any]:
        """
        Converts an approved/sent quotation into an active subscription and
        generates the initial recurring billing invoice atomically.
        """
        if quotation.status == QuotationStatus.CONVERTED:
            raise ValueError(f"Quotation {quotation.quotation_number} has already been converted to a subscription.")

        today = date.today()

        # Resolve or fallback plan
        target_plan_id = quotation.plan_id or options.get("plan_id") or options.get("planId")
        if target_plan_id and not str(target_plan_id).isdigit():
            target_plan_id = None
        elif target_plan_id:
            target_plan_id = int(target_plan_id)

        if not target_plan_id:
            first_plan = db.query(Plan).filter(Plan.is_active == True).first()
            if not first_plan:
                raise ValueError("No active subscription plan configured in system.")
            target_plan_id = first_plan.id

        plan = db.query(Plan).filter(Plan.id == target_plan_id).first()
        if not plan:
            raise ValueError(f"Plan #{target_plan_id} not found.")

        # Compute next billing and expiry dates
        freq = plan.billing_frequency if plan else BillingFrequency.MONTHLY
        if freq == BillingFrequency.DAILY:
            next_bill = today + timedelta(days=1)
        elif freq == BillingFrequency.WEEKLY:
            next_bill = today + timedelta(weeks=1)
        elif freq == BillingFrequency.YEARLY:
            next_bill = today + timedelta(days=365)
        else:  # MONTHLY
            next_bill = today + timedelta(days=30)

        expiry_date = today + timedelta(days=365)

        # Generate unique subscription number
        current_year = today.year
        sub_prefix = f"SUB-{current_year}-"
        sub_count = db.query(func.count(Subscription.id)).filter(
            Subscription.subscription_number.like(f"{sub_prefix}%")
        ).scalar() or 0
        subscription_number = f"{sub_prefix}{str(sub_count + 1).zfill(4)}"

        # Initial audit history
        history = [
            {
                "date": today.isoformat(),
                "action": f"Converted from Quotation {quotation.quotation_number}",
                "actor": actor_name
            },
            {
                "date": today.isoformat(),
                "action": "Subscription activated for recurring billing",
                "actor": "System"
            }
        ]

        subscription = Subscription(
            subscription_number=subscription_number,
            customer_id=quotation.customer_id,
            plan_id=plan.id,
            status=SubscriptionStatus.ACTIVE,
            start_date=today,
            expiry_date=expiry_date,
            next_billing_date=next_bill,
            payment_terms=options.get("paymentMethod") or "Razorpay / Card",
            auto_renew=True,
            notes=f"Generated from quotation {quotation.quotation_number}. {quotation.notes or ''}".strip(),
            history=history,
        )

        db.add(subscription)
        db.flush()

        # Copy line items
        sub_items_payload = []
        for q_item in quotation.items:
            sub_item = SubscriptionItem(
                subscription_id=subscription.id,
                product_id=q_item.product_id,
                product_variant_id=q_item.product_variant_id,
                quantity=q_item.quantity,
                unit_price=q_item.unit_price,
                amount=q_item.amount,
            )
            db.add(sub_item)

            prod_name = q_item.product.name if q_item.product else f"Product #{q_item.product_id}"
            var_name = q_item.variant.name if q_item.variant else ""
            desc = f"{prod_name} ({var_name})" if var_name else prod_name

            sub_items_payload.append({
                "product_id": q_item.product_id,
                "description": desc,
                "quantity": q_item.quantity,
                "unit_price": q_item.unit_price,
                "tax_rate": quotation.tax_rate,
                "tax_amount": round((q_item.amount * quotation.tax_rate) / Decimal("100.00"), 2),
                "discount_amount": Decimal("0.00"),
            })

        # Generate initial invoice
        created_invoice = InvoiceService.create_invoice(
            db=db,
            customer_id=quotation.customer_id,
            items_data=sub_items_payload,
            due_date=today + timedelta(days=14),
            subscription_id=subscription.id,
            discount_amount=quotation.discount_amount,
            billing_period_start=today,
            billing_period_end=next_bill,
            notes=f"Initial invoice generated from converted Quotation {quotation.quotation_number}."
        )

        # Update quotation state
        quotation.status = QuotationStatus.CONVERTED
        quotation.converted_subscription_id = subscription.id

        db.commit()
        db.refresh(subscription)
        db.refresh(quotation)
        db.refresh(created_invoice)

        return {
            "subscription": subscription,
            "invoice": created_invoice,
            "message": f"Quotation {quotation.quotation_number} successfully converted to Subscription #{subscription.subscription_number}!"
        }
