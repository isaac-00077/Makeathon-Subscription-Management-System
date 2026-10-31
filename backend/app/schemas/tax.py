from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class TaxBase(BaseModel):
    name: str = Field(..., max_length=100, example="GST 18%")
    rate: Decimal = Field(..., ge=0, le=100, example=18.00)
    description: str | None = Field(None, example="Standard GST for software services")
    is_active: bool = True


class TaxCreate(TaxBase):
    pass


class TaxUpdate(BaseModel):
    name: str | None = None
    rate: Decimal | None = Field(None, ge=0, le=100)
    description: str | None = None
    is_active: bool | None = None


class TaxOut(TaxBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
