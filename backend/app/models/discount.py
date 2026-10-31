import enum
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import (
    String, Boolean, DateTime, Date, ForeignKey, Integer,
    Numeric, Text, Enum, Table, Column, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DiscountType(str, enum.Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"


# Many-to-many relationship table between discounts and products
discount_products = Table(
    "discount_products",
    Base.metadata,
    Column("discount_id", Integer, ForeignKey("discounts.id", ondelete="CASCADE"), primary_key=True),
    Column("product_id", Integer, ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
)


class Discount(Base):
    __tablename__ = "discounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    discount_type: Mapped[DiscountType] = mapped_column(
        Enum(DiscountType, native_enum=False, length=20),
        default=DiscountType.PERCENTAGE,
        nullable=False
    )
    value: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)  # 10.00% or $10.00
    min_purchase: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    min_quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_subscription_wide: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    max_uses: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    current_uses: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    applicable_products = relationship("Product", secondary=discount_products, lazy="selectin")
