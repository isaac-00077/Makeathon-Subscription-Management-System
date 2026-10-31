import logging
from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, Any, List
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.plan import BillingFrequency
from app.models.invoice import Invoice, InvoiceStatus
from app.models.tax import Tax
from app.services.invoice_service import InvoiceService
from app.services.tax_service import TaxService
from app.core.config import settings

logger = logging.getLogger(__name__)


def calculate_next_billing_cycle(current_billing_date: date, frequency: BillingFrequency) -> tuple[date, date]:
    """
    Returns (period_start, period_end_and_next_billing_date)
    """
    period_start = current_billing_date
    if frequency == BillingFrequency.DAILY:
        next_date = period_start + timedelta(days=1)
    elif frequency == BillingFrequency.WEEKLY:
        next_date = period_start + timedelta(weeks=1)
    elif frequency == BillingFrequency.YEARLY:
        next_date = period_start + timedelta(days=365)
    else:  # MONTHLY default
        next_date = period_start + timedelta(days=30)
    
    return period_start, next_date


def run_recurring_billing_job(db: Session = None) -> List[Dict[str, Any]]:
    """
    Core automated recurring billing routine.
    Idempotent and safe: will not generate duplicate invoices for the same cycle.
    """
    owns_session = False
    if db is None:
        db = SessionLocal()
        owns_session = True

    processed_invoices = []
    today = date.today()

    try:
        # First update any overdue invoices
        InvoiceService.update_overdue_statuses(db)

        # Retrieve active subscriptions that are due for billing
        due_subscriptions = db.query(Subscription).filter(
            Subscription.status == SubscriptionStatus.ACTIVE,
            Subscription.next_billing_date <= today
        ).all()

        logger.info(f"[RecurringBilling] Found {len(due_subscriptions)} subscriptions due for billing on {today}.")

        for sub in due_subscriptions:
            # Check expiry
            if sub.expiry_date and sub.expiry_date < today:
                sub.status = SubscriptionStatus.EXPIRED
                db.commit()
                continue

            cycle_start, cycle_end = calculate_next_billing_cycle(
                sub.next_billing_date or today,
                sub.plan.billing_frequency if sub.plan else BillingFrequency.MONTHLY
            )

            # Idempotency check: verify no invoice exists for this subscription covering this billing start
            existing_inv = db.query(Invoice).filter(
                Invoice.subscription_id == sub.id,
                Invoice.billing_period_start == cycle_start,
                Invoice.status != InvoiceStatus.CANCELLED
            ).first()

            if existing_inv:
                logger.info(f"[RecurringBilling] Subscription #{sub.id} already billed for period {cycle_start}. Advancing next_billing_date.")
                sub.next_billing_date = cycle_end
                db.commit()
                continue

            # Prepare items from subscription
            items_payload = []
            for s_item in sub.items:
                tax_rate = Decimal("0.00")
                if s_item.tax_id:
                    tax_obj = db.query(Tax).filter(Tax.id == s_item.tax_id).first()
                    if tax_obj:
                        tax_rate = tax_obj.rate

                line_amount = s_item.quantity * s_item.unit_price
                line_tax = TaxService.calculate_line_item_tax(line_amount, tax_rate)

                items_payload.append({
                    "product_id": s_item.product_id,
                    "description": f"Subscription: {sub.plan.name if sub.plan else 'Plan'} ({s_item.product.name if s_item.product else 'Item'})",
                    "quantity": s_item.quantity,
                    "unit_price": s_item.unit_price,
                    "tax_rate": tax_rate,
                    "tax_amount": line_tax,
                    "discount_amount": Decimal("0.00"),
                })

            # Create recurring invoice
            created_invoice = InvoiceService.create_invoice(
                db=db,
                customer_id=sub.customer_id,
                items_data=items_payload,
                due_date=today + timedelta(days=14),
                subscription_id=sub.id,
                billing_period_start=cycle_start,
                billing_period_end=cycle_end,
                notes=f"Automated recurring invoice for cycle {cycle_start} to {cycle_end}."
            )

            # Advance subscription billing state
            sub.last_billed_date = today
            sub.next_billing_date = cycle_end
            db.commit()

            processed_invoices.append({
                "subscription_id": sub.id,
                "subscription_number": sub.subscription_number,
                "invoice_id": created_invoice.id,
                "invoice_number": created_invoice.invoice_number,
                "total": float(created_invoice.grand_total)
            })

    except Exception as e:
        logger.error(f"[RecurringBilling] Error during recurring billing run: {e}", exc_info=True)
        db.rollback()
    finally:
        if owns_session:
            db.close()

    return processed_invoices


# APScheduler Instance
scheduler = BackgroundScheduler()


def start_scheduler():
    if not settings.ENABLE_BILLING_SCHEDULER:
        logger.info("[Scheduler] Billing scheduler is disabled in configuration.")
        return

    if not scheduler.running:
        scheduler.add_job(
            run_recurring_billing_job,
            "interval",
            minutes=settings.BILLING_CHECK_INTERVAL_MINUTES,
            id="recurring_billing_job",
            replace_existing=True
        )
        scheduler.start()
        logger.info(f"[Scheduler] APScheduler started. Interval: {settings.BILLING_CHECK_INTERVAL_MINUTES} mins.")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("[Scheduler] APScheduler stopped.")
