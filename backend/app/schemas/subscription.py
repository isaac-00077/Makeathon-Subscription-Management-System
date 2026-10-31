from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.models.subscription import SubscriptionStatus
from app.models.plan import BillingFrequency


# ----------------------------------------------------
# Subscription Items
# ----------------------------------------------------
class SubscriptionItemBase(BaseModel):
    product_id: Optional[int] = None
    productId: Optional[int] = None
    product_variant_id: Optional[int] = None
    variantId: Optional[Any] = None
    quantity: int = Field(default=1, ge=1)
    unit_price: Optional[Decimal] = None
    unitPrice: Optional[Decimal] = None
    tax_id: Optional[int] = None
    discount_id: Optional[int] = None
    amount: Optional[Decimal] = None


class SubscriptionItemCreate(SubscriptionItemBase):
    pass


class SubscriptionItemResponse(BaseModel):
    id: int
    subscription_id: int
    product_id: int
    product_variant_id: Optional[int] = None
    quantity: int
    unit_price: Decimal
    tax_id: Optional[int] = None
    discount_id: Optional[int] = None
    amount: Decimal

    product_name: Optional[str] = None
    variant_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    def productId(self) -> int:
        return self.product_id

    @computed_field
    def productName(self) -> str:
        return self.product_name or f"Product #{self.product_id}"

    @computed_field
    def variantId(self) -> Optional[int]:
        return self.product_variant_id

    @computed_field
    def variantName(self) -> Optional[str]:
        return self.variant_name or "Standard Edition"

    @computed_field
    def unitPrice(self) -> float:
        return float(self.unit_price)

    @computed_field
    def totalPrice(self) -> float:
        return float(self.amount)


# ----------------------------------------------------
# Subscription Main Schemas
# ----------------------------------------------------
class SubscriptionBase(BaseModel):
    customer_id: Optional[int] = None
    customerId: Optional[Any] = None
    plan_id: Optional[int] = None
    planId: Optional[Any] = None
    status: Optional[SubscriptionStatus] = None
    start_date: Optional[date] = None
    startDate: Optional[date] = None
    expiry_date: Optional[date] = None
    expiryDate: Optional[date] = None
    next_billing_date: Optional[date] = None
    nextBillingDate: Optional[date] = None
    payment_terms: Optional[str] = "Immediate"
    paymentMethod: Optional[str] = None
    auto_renew: Optional[bool] = True
    autoRenew: Optional[bool] = None
    notes: Optional[str] = None
    amount: Optional[Decimal] = None
    quantity: Optional[int] = 1


class SubscriptionCreate(SubscriptionBase):
    customerName: Optional[str] = None
    customerEmail: Optional[str] = None
    customerCompany: Optional[str] = None
    planName: Optional[str] = None
    billingFrequency: Optional[str] = None
    items: List[SubscriptionItemCreate] = Field(default_factory=list)
    productLines: Optional[List[Dict[str, Any]]] = None


class SubscriptionUpdate(BaseModel):
    plan_id: Optional[int] = None
    planId: Optional[Any] = None
    status: Optional[SubscriptionStatus] = None
    start_date: Optional[date] = None
    expiry_date: Optional[date] = None
    next_billing_date: Optional[date] = None
    payment_terms: Optional[str] = None
    auto_renew: Optional[bool] = None
    notes: Optional[str] = None
    history: Optional[List[Dict[str, Any]]] = None


class SubscriptionActionRequest(BaseModel):
    reason: Optional[str] = "Action requested by user"


class SubscriptionResponse(BaseModel):
    id: int
    subscription_number: str
    customer_id: int
    plan_id: int
    status: SubscriptionStatus
    start_date: date
    expiry_date: Optional[date] = None
    next_billing_date: Optional[date] = None
    last_billed_date: Optional[date] = None
    payment_terms: str
    auto_renew: bool
    notes: Optional[str] = None
    history: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    # Contextual fields
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_company: Optional[str] = None
    plan_name: Optional[str] = None
    billing_frequency: Optional[str] = None
    items: List[SubscriptionItemResponse] = Field(default_factory=list)
    total_amount: Optional[Decimal] = None

    model_config = ConfigDict(from_attributes=True)

    # CamelCase compatibility for React frontend
    @computed_field
    def subscriptionNumber(self) -> str:
        return self.subscription_number

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
    def planId(self) -> int:
        return self.plan_id

    @computed_field
    def planName(self) -> str:
        return self.plan_name or "Standard Plan"

    @computed_field
    def billingFrequency(self) -> str:
        if self.billing_frequency:
            return self.billing_frequency.capitalize()
        return "Monthly"

    @computed_field
    def amount(self) -> float:
        if self.total_amount is not None:
            return float(self.total_amount)
        if self.items:
            return float(sum(item.amount for item in self.items))
        return 0.0

    @computed_field
    def quantity(self) -> int:
        if self.items:
            return sum(item.quantity for item in self.items)
        return 1

    @computed_field
    def startDate(self) -> str:
        return self.start_date.isoformat()

    @computed_field
    def expiryDate(self) -> Optional[str]:
        return self.expiry_date.isoformat() if self.expiry_date else None

    @computed_field
    def nextBillingDate(self) -> Optional[str]:
        return self.next_billing_date.isoformat() if self.next_billing_date else None

    @computed_field
    def paymentMethod(self) -> str:
        return self.payment_terms or "Razorpay / Card"

    @computed_field
    def productLines(self) -> List[Dict[str, Any]]:
        return [
            {
                "productId": item.product_id,
                "productName": item.product_name or f"Product #{item.product_id}",
                "variant": item.variant_name or "Standard Edition",
                "qty": item.quantity,
                "price": float(item.unit_price),
                "total": float(item.amount),
            }
            for item in self.items
        ]
