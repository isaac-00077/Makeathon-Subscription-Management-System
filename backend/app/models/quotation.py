import enum
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import (
    String, DateTime, Date, ForeignKey, Integer,
    Numeric, Text, Enum, Boolean, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class QuotationStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    APPROVED = "approved"  # Alias / synonym for accepted
    REJECTED = "rejected"
    CONVERTED = "converted"
    EXPIRED = "expired"


class Quotation(Base):
    __tablename__ = "quotations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    quotation_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    customer_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("plans.id", ondelete="SET NULL"), nullable=True)

    status: Mapped[QuotationStatus] = mapped_column(
        Enum(QuotationStatus, native_enum=False, length=20),
        default=QuotationStatus.DRAFT,
        nullable=False,
        index=True
    )

    template_name: Mapped[str | None] = mapped_column(String(150), nullable=True, default="Standard Template")
    valid_until: Mapped[date] = mapped_column(Date, nullable=False)
    
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    
    discount_type: Mapped[str | None] = mapped_column(String(20), default="percentage", nullable=True)
    discount_value: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    converted_subscription_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True)
    terms: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    customer = relationship("User", foreign_keys=[customer_id], lazy="joined")
    plan = relationship("Plan", foreign_keys=[plan_id], lazy="joined")
    items = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan", lazy="selectin")
    converted_subscription = relationship("Subscription", foreign_keys=[converted_subscription_id], lazy="joined")


class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    quotation_id: Mapped[int] = mapped_column(Integer, ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    product_variant_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)

    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    quotation = relationship("Quotation", back_populates="items")
    product = relationship("Product", lazy="joined")
    variant = relationship("ProductVariant", lazy="joined")


class QuotationTemplate(Base):
    __tablename__ = "quotation_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    plan_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("plans.id", ondelete="SET NULL"), nullable=True)
    validity_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    terms: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    plan = relationship("Plan", lazy="joined")
    items = relationship("QuotationTemplateItem", back_populates="template", cascade="all, delete-orphan", lazy="selectin")


class QuotationTemplateItem(Base):
    __tablename__ = "quotation_template_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    template_id: Mapped[int] = mapped_column(Integer, ForeignKey("quotation_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    product_variant_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)

    template = relationship("QuotationTemplate", back_populates="items")
    product = relationship("Product", lazy="joined")
    variant = relationship("ProductVariant", lazy="joined")
