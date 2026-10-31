from datetime import datetime, date
from decimal import Decimal
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.invoice import Invoice, InvoiceStatus


class PaymentService:
    @staticmethod
    def generate_payment_number(db: Session) -> str:
        current_year = date.today().year
        prefix = f"PAY-{current_year}-"
        count = db.query(func.count(Payment.id)).filter(
            Payment.payment_number.like(f"{prefix}%")
        ).scalar() or 0
        return f"{prefix}{str(count + 1).zfill(4)}"

    @staticmethod
    def record_payment(
        db: Session,
        invoice_id: int,
        amount: Decimal,
        method: str = "manual",
        transaction_reference: Optional[str] = None,
        notes: Optional[str] = None,
        payment_date: Optional[datetime] = None,
        razorpay_order_id: Optional[str] = None,
        razorpay_payment_id: Optional[str] = None,
        razorpay_signature: Optional[str] = None
    ) -> Dict[str, Any]:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise ValueError(f"Invoice #{invoice_id} not found.")

        if invoice.status == InvoiceStatus.CANCELLED:
            raise ValueError("Cannot record payment on a cancelled invoice.")

        if invoice.balance <= Decimal("0.00") and invoice.status == InvoiceStatus.PAID:
            raise ValueError("This invoice is already settled in full.")

        if amount <= Decimal("0.00"):
            raise ValueError("Payment amount must be greater than zero.")

        # Determine parsed payment method enum
        method_map = {
            "manual": PaymentMethod.MANUAL,
            "cash": PaymentMethod.CASH,
            "bank transfer": PaymentMethod.BANK_TRANSFER,
            "bank_transfer": PaymentMethod.BANK_TRANSFER,
            "upi": PaymentMethod.UPI,
            "cheque": PaymentMethod.CHEQUE,
            "razorpay": PaymentMethod.RAZORPAY,
        }
        pay_enum = method_map.get(str(method).lower().strip(), PaymentMethod.MANUAL)

        payment_number = PaymentService.generate_payment_number(db)
        if not payment_date:
            payment_date = datetime.utcnow()

        payment = Payment(
            payment_number=payment_number,
            invoice_id=invoice.id,
            customer_id=invoice.customer_id,
            amount=amount,
            payment_method=pay_enum,
            status=PaymentStatus.SUCCESS,
            payment_date=payment_date,
            transaction_reference=transaction_reference,
            razorpay_order_id=razorpay_order_id,
            razorpay_payment_id=razorpay_payment_id,
            razorpay_signature=razorpay_signature,
            notes=notes
        )
        db.add(payment)

        # Update invoice balance and status
        new_paid = invoice.amount_paid + amount
        new_balance = max(Decimal("0.00"), invoice.grand_total - new_paid)
        
        invoice.amount_paid = new_paid
        invoice.balance = new_balance

        if invoice.balance <= Decimal("0.00"):
            invoice.status = InvoiceStatus.PAID
        else:
            invoice.status = InvoiceStatus.PARTIALLY_PAID

        db.commit()
        db.refresh(payment)
        db.refresh(invoice)

        return {
            "payment": payment,
            "invoice": invoice,
            "message": "Payment recorded successfully."
        }
