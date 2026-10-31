from datetime import date, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.invoice import Invoice, InvoiceItem, InvoiceStatus
from app.models.subscription import Subscription
from app.models.user import User


class InvoiceService:
    @staticmethod
    def generate_invoice_number(db: Session) -> str:
        current_year = date.today().year
        prefix = f"INV-{current_year}-"
        
        # Get count of invoices for the current year
        count = db.query(func.count(Invoice.id)).filter(
            Invoice.invoice_number.like(f"{prefix}%")
        ).scalar() or 0
        
        return f"{prefix}{str(count + 1).zfill(4)}"

    @staticmethod
    def create_invoice(
        db: Session,
        customer_id: int,
        items_data: List[Dict[str, Any]],
        due_date: Optional[date] = None,
        subscription_id: Optional[int] = None,
        discount_id: Optional[int] = None,
        discount_amount: Decimal = Decimal("0.00"),
        billing_period_start: Optional[date] = None,
        billing_period_end: Optional[date] = None,
        notes: Optional[str] = None,
        status: InvoiceStatus = InvoiceStatus.PENDING
    ) -> Invoice:
        if not due_date:
            due_date = date.today() + timedelta(days=30)

        invoice_number = InvoiceService.generate_invoice_number(db)
        
        invoice = Invoice(
            invoice_number=invoice_number,
            customer_id=customer_id,
            subscription_id=subscription_id,
            issue_date=date.today(),
            due_date=due_date,
            billing_period_start=billing_period_start,
            billing_period_end=billing_period_end,
            status=status,
            discount_id=discount_id,
            discount_amount=discount_amount,
            notes=notes
        )

        subtotal = Decimal("0.00")
        total_tax = Decimal("0.00")

        db.add(invoice)
        db.flush()  # assign invoice.id

        for item in items_data:
            qty = int(item.get("quantity", 1))
            u_price = Decimal(str(item.get("unit_price", 0.00)))
            t_rate = Decimal(str(item.get("tax_rate", 0.00)))
            t_amount = Decimal(str(item.get("tax_amount", 0.00)))
            d_amount = Decimal(str(item.get("discount_amount", 0.00)))

            line_subtotal = qty * u_price
            
            # Recalculate tax if not provided
            if t_amount == Decimal("0.00") and t_rate > Decimal("0.00"):
                t_amount = round((line_subtotal * t_rate) / Decimal("100.00"), 2)

            line_total = line_subtotal - d_amount + t_amount

            subtotal += line_subtotal
            total_tax += t_amount

            invoice_item = InvoiceItem(
                invoice_id=invoice.id,
                product_id=item.get("product_id"),
                description=item.get("description", "Product Subscription"),
                quantity=qty,
                unit_price=u_price,
                tax_rate=t_rate,
                tax_amount=t_amount,
                discount_amount=d_amount,
                total_price=line_total
            )
            db.add(invoice_item)

        invoice.subtotal = subtotal
        invoice.tax_amount = total_tax
        invoice.grand_total = max(Decimal("0.00"), subtotal - discount_amount + total_tax)
        invoice.amount_paid = Decimal("0.00")
        invoice.balance = invoice.grand_total

        db.commit()
        db.refresh(invoice)
        return invoice

    @staticmethod
    def confirm_invoice(db: Session, invoice: Invoice) -> Invoice:
        if invoice.status in (InvoiceStatus.DRAFT, InvoiceStatus.PENDING):
            invoice.status = InvoiceStatus.PENDING
            db.commit()
            db.refresh(invoice)
        return invoice

    @staticmethod
    def cancel_invoice(db: Session, invoice: Invoice, reason: Optional[str] = None) -> Invoice:
        if invoice.status == InvoiceStatus.PAID:
            raise ValueError("Cannot cancel a fully settled/paid invoice.")
        
        invoice.status = InvoiceStatus.CANCELLED
        if reason:
            invoice.notes = f"{invoice.notes or ''} [Cancelled: {reason}]".strip()
        db.commit()
        db.refresh(invoice)
        return invoice

    @staticmethod
    def update_overdue_statuses(db: Session):
        today = date.today()
        overdue_invoices = db.query(Invoice).filter(
            Invoice.status.in_([InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.CONFIRMED]),
            Invoice.due_date < today,
            Invoice.balance > 0
        ).all()

        for inv in overdue_invoices:
            inv.status = InvoiceStatus.OVERDUE
        
        if overdue_invoices:
            db.commit()
