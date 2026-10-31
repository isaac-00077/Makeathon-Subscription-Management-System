from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional, Any
from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.models.quotation import QuotationStatus


# ----------------------------------------------------
# Quotation Items
# ----------------------------------------------------
class QuotationItemBase(BaseModel):
    product_id: Optional[int] = None
    productId: Optional[int] = None
    product_name: Optional[str] = None
    productName: Optional[str] = None
    product_variant_id: Optional[int] = None
    variantId: Optional[Any] = None
    variant_name: Optional[str] = None
    variantName: Optional[str] = None
    quantity: int = Field(default=1, ge=1)
    unit_price: Optional[Decimal] = None
    unitPrice: Optional[Decimal] = None
    amount: Optional[Decimal] = None
    totalPrice: Optional[Decimal] = None


class QuotationItemCreate(QuotationItemBase):
    pass


class QuotationItemResponse(BaseModel):
    id: int
    quotation_id: int
    product_id: int
    product_variant_id: Optional[int] = None
    quantity: int
    unit_price: Decimal
    amount: Decimal

    # Contextual fields
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
# Quotation Template Schemas
# ----------------------------------------------------
class QuotationTemplateItemBase(BaseModel):
    product_id: int
    product_variant_id: Optional[int] = None
    quantity: int = Field(default=1, ge=1)
    unit_price: Optional[Decimal] = None


class QuotationTemplateItemCreate(QuotationTemplateItemBase):
    pass


class QuotationTemplateItemResponse(BaseModel):
    id: int
    template_id: int
    product_id: int
    product_variant_id: Optional[int] = None
    quantity: int
    unit_price: Optional[Decimal] = None
    product_name: Optional[str] = None
    variant_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class QuotationTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    plan_id: Optional[int] = None
    validity_days: int = Field(default=30, ge=1)
    terms: Optional[str] = None
    is_active: bool = True


class QuotationTemplateCreate(QuotationTemplateBase):
    items: List[QuotationTemplateItemCreate] = Field(default_factory=list)


class QuotationTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    plan_id: Optional[int] = None
    validity_days: Optional[int] = None
    terms: Optional[str] = None
    is_active: Optional[bool] = None
    items: Optional[List[QuotationTemplateItemCreate]] = None


class QuotationTemplateResponse(QuotationTemplateBase):
    id: int
    created_at: datetime
    updated_at: datetime
    items: List[QuotationTemplateItemResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


# ----------------------------------------------------
# Quotation Main Schemas
# ----------------------------------------------------
class QuotationBase(BaseModel):
    customer_id: Optional[int] = None
    customerId: Optional[Any] = None
    plan_id: Optional[int] = None
    planId: Optional[Any] = None
    template: Optional[str] = "Standard Template"
    template_name: Optional[str] = None
    valid_until: Optional[date] = None
    validityDate: Optional[date] = None
    issueDate: Optional[date] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    discount_type: Optional[str] = "percentage"
    discountType: Optional[str] = None
    discount_value: Optional[Decimal] = Decimal("0.00")
    discountValue: Optional[Decimal] = None
    tax_rate: Optional[Decimal] = Decimal("0.00")
    taxRate: Optional[Decimal] = None
    subtotal: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    discountAmount: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    taxAmount: Optional[Decimal] = None
    grandTotal: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    status: Optional[str] = None


class QuotationCreate(QuotationBase):
    customerName: Optional[str] = None
    customerEmail: Optional[str] = None
    items: List[QuotationItemCreate] = Field(default_factory=list)


class QuotationUpdate(BaseModel):
    valid_until: Optional[date] = None
    validityDate: Optional[date] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    template: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[Decimal] = None
    tax_rate: Optional[Decimal] = None
    status: Optional[str] = None
    items: Optional[List[QuotationItemCreate]] = None


class QuotationResponse(BaseModel):
    id: int
    quotation_number: str
    customer_id: int
    plan_id: Optional[int] = None
    status: QuotationStatus
    template_name: Optional[str] = "Standard Template"
    valid_until: date
    subtotal: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    discount_type: Optional[str] = "percentage"
    discount_value: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    converted_subscription_id: Optional[int] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Contextual fields
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_company: Optional[str] = None
    items: List[QuotationItemResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

    # CamelCase compatibility for React frontend
    @computed_field
    def quotationNumber(self) -> str:
        return self.quotation_number

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
    def template(self) -> str:
        return self.template_name or "Standard Template"

    @computed_field
    def validityDate(self) -> str:
        return self.valid_until.isoformat()

    @computed_field
    def discountType(self) -> str:
        return self.discount_type or "percentage"

    @computed_field
    def discountValue(self) -> float:
        return float(self.discount_value)

    @computed_field
    def discountAmount(self) -> float:
        return float(self.discount_amount)

    @computed_field
    def taxRate(self) -> float:
        return float(self.tax_rate)

    @computed_field
    def taxAmount(self) -> float:
        return float(self.tax_amount)

    @computed_field
    def grandTotal(self) -> float:
        return float(self.total_amount)

    @computed_field
    def convertedSubscriptionId(self) -> Optional[int]:
        return self.converted_subscription_id

    @computed_field
    def createdAt(self) -> str:
        return self.created_at.strftime("%Y-%m-%d")


class QuotationConvertToSubOptions(BaseModel):
    planId: Optional[Any] = None
    plan_id: Optional[int] = None
    planName: Optional[str] = None
    billingFrequency: Optional[str] = None
    paymentMethod: Optional[str] = None
    start_date: Optional[date] = None


class QuotationConvertToSubResponse(BaseModel):
    subscription: Any
    invoice: Optional[Any] = None
    message: str
