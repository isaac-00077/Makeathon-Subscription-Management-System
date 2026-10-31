import enum
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import (
    String, Boolean, DateTime, Date, ForeignKey, Integer,
    Numeric, Text, Enum, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SubscriptionStatus(str, enum.Enum):
    DRAFT = "draft"
    QUOTATION = "quotation"
    CONFIRMED = "confirmed"
    ACTIVE = "active"
    PAUSED = "paused"
    EXPIRED = "expired"
    CLOSED = "closed"


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    subscription_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    customer_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id: Mapped[int] = mapped_column(Integer, ForeignKey("plans.id", ondelete="RESTRICT"), nullable=False, index=True)

    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus, native_enum=False, length=20),
        default=SubscriptionStatus.ACTIVE,
        nullable=False,
        index=True
    )

    start_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    next_billing_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    last_billed_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    payment_terms: Mapped[str] = mapped_column(String(100), default="Immediate", nullable=False)
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    customer = relationship("User", foreign_keys=[customer_id], lazy="joined")
    plan = relationship("Plan", foreign_keys=[plan_id], lazy="joined")
    items = relationship("SubscriptionItem", back_populates="subscription", cascade="all, delete-orphan", lazy="selectin")
    invoices = relationship("Invoice", back_populates="subscription")


class SubscriptionItem(Base):
    __tablename__ = "subscription_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    subscription_id: Mapped[int] = mapped_column(Integer, ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True)
    product_variant_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)

    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tax_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("taxes.id", ondelete="SET NULL"), nullable=True)
    discount_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("discounts.id", ondelete="SET NULL"), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    subscription = relationship("Subscription", back_populates="items")
    product = relationship("Product", lazy="joined")
    variant = relationship("ProductVariant", lazy="joined")
