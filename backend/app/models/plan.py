import enum
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, Boolean, DateTime, Date, ForeignKey, Integer, Numeric, Text, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class BillingFrequency(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    billing_frequency: Mapped[BillingFrequency] = mapped_column(
        Enum(BillingFrequency, native_enum=False, length=20),
        nullable=False,
        default=BillingFrequency.MONTHLY
    )
    minimum_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    
    available_from: Mapped[date] = mapped_column(Date, nullable=False)
    available_until: Mapped[date | None] = mapped_column(Date, nullable=True)
    
    # Plan policy settings
    auto_close: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    allow_early_closure: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allow_pause: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allow_renewal: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    product = relationship("Product", back_populates="plans")
