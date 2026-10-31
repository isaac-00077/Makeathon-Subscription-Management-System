from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.discount import DiscountType


class DiscountBase(BaseModel):
    code: str = Field(..., max_length=50, example="LAUNCH20")
    name: str = Field(..., max_length=150, example="Launch 20% Discount")
    discount_type: DiscountType = DiscountType.PERCENTAGE
    value: Decimal = Field(..., ge=0, example=20.00)
    min_purchase: Decimal = Field(default=Decimal("0.00"), ge=0, example=0.00)
    min_quantity: int = Field(default=1, ge=1, example=1)
    is_subscription_wide: bool = True
    start_date: date
    end_date: Optional[date] = None
    max_uses: int = Field(default=100, ge=1)
    is_active: bool = True


class DiscountCreate(DiscountBase):
    applicable_product_ids: Optional[List[int]] = Field(default_factory=list)


class DiscountUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    discount_type: Optional[DiscountType] = None
    value: Optional[Decimal] = None
    min_purchase: Optional[Decimal] = None
    min_quantity: Optional[int] = None
    is_subscription_wide: Optional[bool] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    max_uses: Optional[int] = None
    is_active: Optional[bool] = None
    applicable_product_ids: Optional[List[int]] = None


class DiscountOut(DiscountBase):
    id: int
    current_uses: int
    created_at: datetime
    updated_at: datetime
    applicable_product_ids: List[int] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class DiscountValidateRequest(BaseModel):
    code: str
    subtotal: Decimal = Field(default=Decimal("0.00"), ge=0)
    quantity: int = Field(default=1, ge=1)


class DiscountValidateResponse(BaseModel):
    valid: bool
    calculated_amount: Decimal
    discount: Optional[DiscountOut] = None
    message: Optional[str] = None
