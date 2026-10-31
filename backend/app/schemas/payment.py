from datetime import datetime
from decimal import Decimal
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict, Field, computed_field
from app.models.payment import PaymentMethod, PaymentStatus


class PaymentRecordRequest(BaseModel):
    invoice_id: Optional[int] = None
    invoiceId: Optional[Any] = None
    amount: Decimal = Field(..., gt=0, example=150.00)
    method: Optional[str] = Field("manual", example="bank_transfer")
    transaction_reference: Optional[str] = None
    transactionReference: Optional[str] = None
    notes: Optional[str] = None
    payment_date: Optional[datetime] = None
    paymentDate: Optional[Any] = None


class PaymentOut(BaseModel):
    id: int
    payment_number: str
    invoice_id: int
    customer_id: int
    amount: Decimal
    payment_method: PaymentMethod
    status: PaymentStatus
    payment_date: datetime
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    # Contextual extras
    invoice_number: Optional[str] = None
    customer_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    # CamelCase computed fields for frontend
    @computed_field
    def paymentNumber(self) -> str:
        return self.payment_number

    @computed_field
    def invoiceNumber(self) -> str:
        return self.invoice_number or f"INV-#{self.invoice_id}"

    @computed_field
    def customerName(self) -> str:
        return self.customer_name or f"Customer #{self.customer_id}"

    @computed_field
    def method(self) -> str:
        return self.payment_method.value

    @computed_field
    def transactionReference(self) -> Optional[str]:
        return self.transaction_reference

    @computed_field
    def paymentDate(self) -> str:
        return self.payment_date.strftime("%Y-%m-%d %H:%M:%S")


class RazorpayOrderCreate(BaseModel):
    invoice_id: Optional[int] = None
    invoiceId: Optional[Any] = None
    amount: Decimal = Field(..., gt=0, example=500.00)
    currency: str = Field(default="INR", example="INR")


class RazorpayOrderResponse(BaseModel):
    keyId: str
    orderId: str
    amount: float
    currency: str = "INR"
    isTestSandbox: bool = False


class RazorpayVerifyRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str
    invoice_id: Optional[int] = None
    invoiceId: Optional[Any] = None


class RazorpayVerifyResponse(BaseModel):
    success: bool
    verified: bool
    message: str
    payment_id: str
    paymentId: str
