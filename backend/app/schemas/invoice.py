from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional, Any
from pydantic import BaseModel, ConfigDict, Field, computed_field
from app.models.invoice import InvoiceStatus


class InvoiceItemBase(BaseModel):
    product_id: Optional[int] = None
    description: str
    quantity: int = Field(default=1, ge=1)
    unit_price: Decimal = Field(..., ge=0)
    tax_rate: Decimal = Field(default=Decimal("0.00"), ge=0)
    tax_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    total_price: Decimal = Field(..., ge=0)


class InvoiceItemCreate(InvoiceItemBase):
    pass


class InvoiceItemOut(InvoiceItemBase):
    id: int
    invoice_id: int

    model_config = ConfigDict(from_attributes=True)


class InvoiceCreate(BaseModel):
    customer_id: Optional[int] = None
    customerId: Optional[int] = None
    subscription_id: Optional[int] = None
    subscriptionId: Optional[int] = None
    issue_date: Optional[date] = None
    issueDate: Optional[date] = None
    due_date: Optional[date] = None
    dueDate: Optional[date] = None
    billing_period_start: Optional[date] = None
    billing_period_end: Optional[date] = None
    discount_id: Optional[int] = None
    discountId: Optional[int] = None
    notes: Optional[str] = None
    items: List[InvoiceItemCreate] = Field(default_factory=list)


class InvoiceUpdate(BaseModel):
    status: Optional[InvoiceStatus] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None


class InvoiceOut(BaseModel):
    id: int
    invoice_number: str
    customer_id: int
    subscription_id: Optional[int] = None
    issue_date: date
    due_date: date
    billing_period_start: Optional[date] = None
    billing_period_end: Optional[date] = None
    status: InvoiceStatus
    subtotal: Decimal
    discount_amount: Decimal
    discount_id: Optional[int] = None
    tax_amount: Decimal
    grand_total: Decimal
    amount_paid: Decimal
    balance: Decimal
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[InvoiceItemOut] = Field(default_factory=list)

    # Contextual fields populated in router/service for frontend ease
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_company: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    # CamelCase compatibility aliases for React frontend
    @computed_field
    def invoiceNumber(self) -> str:
        return self.invoice_number

    @computed_field
    def customerId(self) -> int:
        return self.customer_id

    @computed_field
    def customerName(self) -> str:
        return self.customer_name or f"Customer #{self.customer_id}"

    @computed_field
    def customerEmail(self) -> str:
        return self.customer_email or ""

    @computed_field
    def customerCompany(self) -> str:
        return self.customer_company or ""

    @computed_field
    def subscriptionId(self) -> Optional[int]:
        return self.subscription_id

    @computed_field
    def issueDate(self) -> str:
        return self.issue_date.isoformat()

    @computed_field
    def dueDate(self) -> str:
        return self.due_date.isoformat()

    @computed_field
    def discountAmount(self) -> float:
        return float(self.discount_amount)

    @computed_field
    def taxTotal(self) -> float:
        return float(self.tax_amount)

    @computed_field
    def grandTotal(self) -> float:
        return float(self.grand_total)

    @computed_field
    def amountPaid(self) -> float:
        return float(self.amount_paid)
