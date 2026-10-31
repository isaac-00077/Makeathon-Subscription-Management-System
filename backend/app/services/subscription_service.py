from datetime import date, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.subscription import Subscription, SubscriptionItem, SubscriptionStatus
from app.models.plan import Plan, BillingFrequency
from app.models.product import Product, ProductVariant
from app.models.user import User


class SubscriptionService:
    @staticmethod
    def generate_subscription_number(db: Session) -> str:
        current_year = date.today().year
        prefix = f"SUB-{current_year}-"
        
        count = db.query(func.count(Subscription.id)).filter(
            Subscription.subscription_number.like(f"{prefix}%")
        ).scalar() or 0
        
        return f"{prefix}{str(count + 1).zfill(4)}"

    @staticmethod
    def calculate_cycle_dates(start_date: date, frequency: BillingFrequency) -> tuple[date, date]:
        """Returns (start_date, next_billing_date)"""
        if frequency == BillingFrequency.DAILY:
            next_date = start_date + timedelta(days=1)
        elif frequency == BillingFrequency.WEEKLY:
            next_date = start_date + timedelta(weeks=1)
        elif frequency == BillingFrequency.YEARLY:
            next_date = start_date + timedelta(days=365)
        else:  # MONTHLY default
            next_date = start_date + timedelta(days=30)
        return start_date, next_date

    @staticmethod
    def append_history(subscription: Subscription, action: str, actor: str = "System"):
        today_iso = date.today().isoformat()
        current_history = list(subscription.history or [])
        current_history.append({
            "date": today_iso,
            "action": action,
            "actor": actor
        })
        subscription.history = current_history

    @staticmethod
    def create_subscription(
        db: Session,
        customer_id: int,
        plan_id: int,
        items_data: List[Dict[str, Any]],
        start_date: Optional[date] = None,
        expiry_date: Optional[date] = None,
        payment_terms: str = "Immediate",
        auto_renew: bool = True,
        notes: Optional[str] = None,
        actor_name: str = "Operational Staff"
    ) -> Subscription:
        plan = db.query(Plan).filter(Plan.id == plan_id).first()
        if not plan:
            raise ValueError(f"Plan with ID {plan_id} does not exist.")

        if not start_date:
            start_date = date.today()

        _, next_billing = SubscriptionService.calculate_cycle_dates(start_date, plan.billing_frequency)
        if not expiry_date:
            expiry_date = start_date + timedelta(days=365)

        sub_number = SubscriptionService.generate_subscription_number(db)

        initial_history = [
            {
                "date": start_date.isoformat(),
                "action": "Subscription created manually",
                "actor": actor_name
            }
        ]

        subscription = Subscription(
            subscription_number=sub_number,
            customer_id=customer_id,
            plan_id=plan_id,
            status=SubscriptionStatus.ACTIVE,
            start_date=start_date,
            expiry_date=expiry_date,
            next_billing_date=next_billing,
            payment_terms=payment_terms,
            auto_renew=auto_renew,
            notes=notes,
            history=initial_history,
        )

        db.add(subscription)
        db.flush()

        for item in items_data:
            qty = int(item.get("quantity") or item.get("qty") or 1)
            unit_price = Decimal(str(item.get("unit_price") or item.get("unitPrice") or item.get("price") or 0.00))
            if unit_price == Decimal("0.00"):
                # fallback to product base price
                p_id = item.get("product_id") or item.get("productId")
                if p_id:
                    prod = db.query(Product).filter(Product.id == int(p_id)).first()
                    if prod:
                        unit_price = prod.sales_price

            variant_id = item.get("product_variant_id") or item.get("variantId")
            if variant_id and not str(variant_id).isdigit():
                variant_id = None
            elif variant_id:
                variant_id = int(variant_id)

            sub_item = SubscriptionItem(
                subscription_id=subscription.id,
                product_id=int(item.get("product_id") or item.get("productId")),
                product_variant_id=variant_id,
                quantity=qty,
                unit_price=unit_price,
                amount=qty * unit_price,
            )
            db.add(sub_item)

        db.commit()
        db.refresh(subscription)
        return subscription

    @staticmethod
    def activate_subscription(db: Session, subscription: Subscription, actor: str = "Admin") -> Subscription:
        if subscription.status == SubscriptionStatus.CLOSED:
            raise ValueError("Cannot activate a permanently closed subscription.")

        subscription.status = SubscriptionStatus.ACTIVE
        if not subscription.next_billing_date or subscription.next_billing_date <= date.today():
            freq = subscription.plan.billing_frequency if subscription.plan else BillingFrequency.MONTHLY
            _, next_bill = SubscriptionService.calculate_cycle_dates(date.today(), freq)
            subscription.next_billing_date = next_bill

        SubscriptionService.append_history(subscription, "Subscription Activated", actor)
        db.commit()
        db.refresh(subscription)
        return subscription

    @staticmethod
    def pause_subscription(db: Session, subscription: Subscription, actor: str = "Staff", reason: str = "Paused by user") -> Subscription:
        if subscription.status != SubscriptionStatus.ACTIVE:
            raise ValueError(f"Only active subscriptions can be paused (current status: {subscription.status.value}).")

        if subscription.plan and not subscription.plan.allow_pause:
            raise ValueError(f"Subscription plan '{subscription.plan.name}' policy prohibits pausing.")

        subscription.status = SubscriptionStatus.PAUSED
        SubscriptionService.append_history(subscription, f"Subscription Paused ({reason})", actor)
        db.commit()
        db.refresh(subscription)
        return subscription

    @staticmethod
    def resume_subscription(db: Session, subscription: Subscription, actor: str = "Staff") -> Subscription:
        if subscription.status != SubscriptionStatus.PAUSED:
            raise ValueError(f"Subscription is not paused (current status: {subscription.status.value}).")

        subscription.status = SubscriptionStatus.ACTIVE
        freq = subscription.plan.billing_frequency if subscription.plan else BillingFrequency.MONTHLY
        _, next_bill = SubscriptionService.calculate_cycle_dates(date.today(), freq)
        subscription.next_billing_date = next_bill

        SubscriptionService.append_history(subscription, "Subscription Resumed", actor)
        db.commit()
        db.refresh(subscription)
        return subscription

    @staticmethod
    def renew_subscription(db: Session, subscription: Subscription, actor: str = "System / User") -> Subscription:
        if subscription.plan and not subscription.plan.allow_renewal:
            raise ValueError(f"Subscription plan '{subscription.plan.name}' policy does not permit renewal.")

        today = date.today()
        base_date = subscription.expiry_date if subscription.expiry_date and subscription.expiry_date > today else today
        new_expiry = base_date + timedelta(days=365)

        freq = subscription.plan.billing_frequency if subscription.plan else BillingFrequency.MONTHLY
        _, next_bill = SubscriptionService.calculate_cycle_dates(today, freq)

        subscription.status = SubscriptionStatus.ACTIVE
        subscription.expiry_date = new_expiry
        subscription.next_billing_date = next_bill

        SubscriptionService.append_history(
            subscription,
            f"Renewed for next billing cycle (extended to {new_expiry.isoformat()})",
            actor
        )
        db.commit()
        db.refresh(subscription)
        return subscription

    @staticmethod
    def close_subscription(db: Session, subscription: Subscription, actor: str = "Staff", reason: str = "Term completion") -> Subscription:
        today = date.today()
        if subscription.expiry_date and today < subscription.expiry_date:
            if subscription.plan and not subscription.plan.allow_early_closure:
                raise ValueError(f"Subscription plan '{subscription.plan.name}' does not allow early closure before expiry.")

        subscription.status = SubscriptionStatus.CLOSED
        SubscriptionService.append_history(subscription, f"Subscription Terminated/Closed ({reason})", actor)
        db.commit()
        db.refresh(subscription)
        return subscription
