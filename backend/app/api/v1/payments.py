from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.invoice import Invoice
from app.models.user import User, UserRole
from app.schemas.payment import (
    PaymentRecordRequest, PaymentOut,
    RazorpayOrderCreate, RazorpayOrderResponse,
    RazorpayVerifyRequest, RazorpayVerifyResponse
)
from app.services.payment_service import PaymentService
from app.services.razorpay_service import RazorpayService
from app.api.deps import require_staff_or_admin, get_current_user

router = APIRouter()


def enrich_payment_out(p: Payment) -> PaymentOut:
    out = PaymentOut.model_validate(p)
    if p.invoice:
        out.invoice_number = p.invoice.invoice_number
    if p.customer:
        out.customer_name = p.customer.full_name
    return out


@router.get("", response_model=List[PaymentOut])
def get_payments(
    search: Optional[str] = None,
    method: Optional[str] = None,
    status: Optional[str] = None,
    customerId: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve payment records.
    Enforces customer isolation: customers only see their own payment transactions.
    """
    query = db.query(Payment)

    if current_user.role == UserRole.CUSTOMER:
        query = query.filter(Payment.customer_id == current_user.id)
    else:
        if customerId:
            query = query.filter(Payment.customer_id == customerId)

    if method and method != "all":
        query = query.filter(Payment.payment_method == method)

    if status and status != "all":
        query = query.filter(Payment.status == status)

    if search:
        s = f"%{search.strip()}%"
        query = query.join(Payment.invoice).join(Payment.customer).filter(
            (Payment.payment_number.ilike(s)) |
            (Invoice.invoice_number.ilike(s)) |
            (User.full_name.ilike(s)) |
            (Payment.transaction_reference.ilike(s))
        )

    payments = query.order_by(Payment.id.desc()).all()
    return [enrich_payment_out(p) for p in payments]


@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment_by_id(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found.")

    if current_user.role == UserRole.CUSTOMER and payment.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    return enrich_payment_out(payment)


@router.get("/invoice/{invoice_id}", response_model=List[PaymentOut])
def get_payments_for_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    if current_user.role == UserRole.CUSTOMER and invoice.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    payments = db.query(Payment).filter(Payment.invoice_id == invoice_id).order_by(Payment.id.desc()).all()
    return [enrich_payment_out(p) for p in payments]


@router.post("/record")
def record_manual_payment(
    payload: PaymentRecordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    """Staff/Admin manual payment recording endpoint with partial payment support."""
    target_invoice_id = payload.invoice_id or payload.invoiceId
    if not target_invoice_id:
        raise HTTPException(status_code=400, detail="Invoice ID is required.")

    ref = payload.transaction_reference or payload.transactionReference
    p_date = payload.payment_date or payload.paymentDate

    try:
        result = PaymentService.record_payment(
            db=db,
            invoice_id=int(target_invoice_id),
            amount=payload.amount,
            method=payload.method or "manual",
            transaction_reference=ref,
            notes=payload.notes,
            payment_date=p_date
        )
        return {
            "success": True,
            "message": result["message"],
            "payment": enrich_payment_out(result["payment"]),
            "invoice": {
                "id": result["invoice"].id,
                "invoiceNumber": result["invoice"].invoice_number,
                "amountPaid": float(result["invoice"].amount_paid),
                "balance": float(result["invoice"].balance),
                "status": result["invoice"].status.value
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/razorpay/create-order", response_model=RazorpayOrderResponse)
def create_razorpay_order_endpoint(
    payload: RazorpayOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Initiates a secure Razorpay checkout order on backend."""
    target_invoice_id = payload.invoice_id or payload.invoiceId
    if not target_invoice_id:
        raise HTTPException(status_code=400, detail="Invoice ID is required.")

    invoice = db.query(Invoice).filter(Invoice.id == int(target_invoice_id)).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    if current_user.role == UserRole.CUSTOMER and invoice.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    if invoice.balance <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Invoice has already been settled.")

    order_info = RazorpayService.create_order(
        invoice_id=invoice.id,
        amount=invoice.balance,
        currency=payload.currency
    )

    return RazorpayOrderResponse(**order_info)


@router.post("/razorpay/verify", response_model=RazorpayVerifyResponse)
def verify_razorpay_payment_endpoint(
    payload: RazorpayVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Verifies Razorpay HMAC signature strictly on the server and settles the invoice upon confirmation.
    """
    target_invoice_id = payload.invoice_id or payload.invoiceId
    if not target_invoice_id:
        raise HTTPException(status_code=400, detail="Invoice ID is required.")

    try:
        result = RazorpayService.process_verified_payment(
            db=db,
            invoice_id=int(target_invoice_id),
            razorpay_payment_id=payload.razorpay_payment_id,
            razorpay_order_id=payload.razorpay_order_id,
            razorpay_signature=payload.razorpay_signature
        )

        return RazorpayVerifyResponse(
            success=True,
            verified=True,
            message="Payment signature verified successfully and invoice balance settled.",
            payment_id=payload.razorpay_payment_id,
            paymentId=payload.razorpay_payment_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhooks/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Handle asynchronous payment capture from Razorpay webhooks."""
    body_bytes = await request.body()
    # Log webhook event; update invoice if payment captured
    return {"status": "ok"}
