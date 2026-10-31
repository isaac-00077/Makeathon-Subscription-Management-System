from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.invoice import Invoice, InvoiceStatus
from app.models.user import User, UserRole
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceOut
from app.services.invoice_service import InvoiceService
from app.services.pdf_service import PDFService
from app.tasks.billing_scheduler import run_recurring_billing_job
from app.api.deps import require_admin, require_staff_or_admin, get_current_user

router = APIRouter()


def enrich_invoice_out(inv: Invoice) -> InvoiceOut:
    out = InvoiceOut.model_validate(inv)
    if inv.customer:
        out.customer_name = inv.customer.full_name
        out.customer_email = inv.customer.email
        out.customer_company = getattr(inv.customer, "company_name", None)
    return out


@router.get("", response_model=List[InvoiceOut])
def get_invoices(
    search: Optional[str] = None,
    status: Optional[str] = None,
    customerId: Optional[int] = None,
    customerEmail: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve invoices.
    Enforces customer isolation: customers see only their own invoices.
    """
    query = db.query(Invoice)

    # Role-based restriction
    if current_user.role == UserRole.CUSTOMER:
        query = query.filter(Invoice.customer_id == current_user.id)
    else:
        if customerId:
            query = query.filter(Invoice.customer_id == customerId)
        if customerEmail:
            query = query.join(Invoice.customer).filter(User.email.ilike(customerEmail.strip()))

    if status and status != "all":
        query = query.filter(Invoice.status == status)

    if search:
        s = f"%{search.strip()}%"
        query = query.join(Invoice.customer).filter(
            (Invoice.invoice_number.ilike(s)) |
            (User.full_name.ilike(s)) |
            (User.email.ilike(s))
        )

    invoices = query.order_by(Invoice.id.desc()).all()
    return [enrich_invoice_out(i) for i in invoices]


@router.post("", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def create_invoice(
    invoice_in: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    """Generate and record a new invoice (Staff or Admin)."""
    target_customer_id = invoice_in.customer_id or invoice_in.customerId
    if not target_customer_id:
        raise HTTPException(status_code=400, detail="Customer ID is required.")

    sub_id = invoice_in.subscription_id or invoice_in.subscriptionId
    disc_id = invoice_in.discount_id or invoice_in.discountId
    due = invoice_in.due_date or invoice_in.dueDate

    items_data = [item.model_dump() for item in invoice_in.items]

    created = InvoiceService.create_invoice(
        db=db,
        customer_id=target_customer_id,
        items_data=items_data,
        due_date=due,
        subscription_id=sub_id,
        discount_id=disc_id,
        billing_period_start=invoice_in.billing_period_start,
        billing_period_end=invoice_in.billing_period_end,
        notes=invoice_in.notes
    )

    return enrich_invoice_out(created)


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice_by_id(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get single invoice details."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    if current_user.role == UserRole.CUSTOMER and invoice.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied: cannot view another customer's invoice.")

    return enrich_invoice_out(invoice)


@router.put("/{invoice_id}", response_model=InvoiceOut)
def update_invoice(
    invoice_id: int,
    invoice_in: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    if invoice_in.status:
        invoice.status = invoice_in.status
    if invoice_in.due_date:
        invoice.due_date = invoice_in.due_date
    if invoice_in.notes is not None:
        invoice.notes = invoice_in.notes

    db.commit()
    db.refresh(invoice)
    return enrich_invoice_out(invoice)


@router.post("/{invoice_id}/confirm", response_model=InvoiceOut)
def confirm_invoice_endpoint(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    confirmed = InvoiceService.confirm_invoice(db, invoice)
    return enrich_invoice_out(confirmed)


@router.post("/{invoice_id}/cancel", response_model=InvoiceOut)
def cancel_invoice_endpoint(
    invoice_id: int,
    payload: dict = {},
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    reason = payload.get("reason", "Cancelled by operational staff")
    try:
        cancelled = InvoiceService.cancel_invoice(db, invoice, reason=reason)
        return enrich_invoice_out(cancelled)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{invoice_id}/send")
def send_invoice_endpoint(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    # In production, dispatch notification email via SMTP/SendGrid
    return {
        "success": True,
        "message": f"Invoice {invoice.invoice_number} dispatched to {invoice.customer.email if invoice.customer else 'customer'}."
    }


@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate and stream ReportLab PDF invoice."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    if current_user.role == UserRole.CUSTOMER and invoice.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    pdf_bytes = PDFService.generate_invoice_pdf(invoice)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{invoice.invoice_number}.pdf"'
        }
    )


@router.post("/trigger-recurring-billing")
def trigger_recurring_billing_manually(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Manually invoke the automated recurring billing job (Admin only)."""
    results = run_recurring_billing_job(db=db)
    return {
        "success": True,
        "message": f"Recurring billing executed. {len(results)} invoices generated.",
        "invoices_generated": results
    }
