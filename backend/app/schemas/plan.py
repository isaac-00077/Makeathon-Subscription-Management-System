from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

from app.models.plan import BillingFrequency
from app.schemas.product import ProductResponse


class PlanBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    product_id: int
    price: Decimal = Field(..., gt=0)
    billing_frequency: BillingFrequency = BillingFrequency.MONTHLY
    minimum_quantity: int = Field(default=1, ge=1)
    available_from: date
    available_until: Optional[date] = None
    auto_close: bool = False
    allow_early_closure: bool = True
    allow_pause: bool = True
    allow_renewal: bool = True
    is_active: bool = True


class PlanCreate(PlanBase):
    pass


class PlanUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None
    product_id: Optional[int] = None
    price: Optional[Decimal] = Field(None, gt=0)
    billing_frequency: Optional[BillingFrequency] = None
    minimum_quantity: Optional[int] = Field(None, ge=1)
    available_from: Optional[date] = None
    available_until: Optional[date] = None
    auto_close: Optional[bool] = None
    allow_early_closure: Optional[bool] = None
    allow_pause: Optional[bool] = None
    allow_renewal: Optional[bool] = None
    is_active: Optional[bool] = None


class PlanResponse(PlanBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlanDetailResponse(PlanResponse):
    product: Optional[ProductResponse] = None
