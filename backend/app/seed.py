from datetime import date
from decimal import Decimal
from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.product import Product, ProductVariant
from app.models.plan import Plan, BillingFrequency
from app.core.security import get_password_hash


def seed_database():
    print("Creating tables if not present...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Seed Admin User
        admin_email = "admin@brightloop.com"
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            admin = User(
                email=admin_email,
                hashed_password=get_password_hash("AdminPassword123!"),
                full_name="System Administrator",
                phone="+919876543210",
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            print(f"Created default admin: {admin_email} / AdminPassword123!")
        else:
            print("Default admin already exists.")

        # 2. Seed Staff User
        staff_email = "staff@brightloop.com"
        staff = db.query(User).filter(User.email == staff_email).first()
        if not staff:
            staff = User(
                email=staff_email,
                hashed_password=get_password_hash("StaffPassword123!"),
                full_name="Operations Staff",
                phone="+919876543211",
                role=UserRole.STAFF,
                is_active=True
            )
            db.add(staff)
            print(f"Created default staff: {staff_email} / StaffPassword123!")

        # 3. Seed Sample Customer
        customer_email = "customer@example.com"
        customer = db.query(User).filter(User.email == customer_email).first()
        if not customer:
            customer = User(
                email=customer_email,
                hashed_password=get_password_hash("CustomerPass123!"),
                full_name="Acme Corp Customer",
                phone="+919876543212",
                role=UserRole.CUSTOMER,
                is_active=True
            )
            db.add(customer)
            print(f"Created sample customer: {customer_email} / CustomerPass123!")

        # 4. Seed Products with Variants (from prompt example: Base ₹1,000, Odoo brand +₹560 = ₹1,560)
        prod1 = db.query(Product).filter(Product.name == "Brightloop ERP Cloud").first()
        if not prod1:
            prod1 = Product(
                name="Brightloop ERP Cloud",
                product_type="software",
                sales_price=Decimal("1000.00"),
                cost_price=Decimal("300.00"),
                notes="Core subscription ERP platform",
                is_active=True
            )
            db.add(prod1)
            db.flush()

            # Add variants
            v1 = ProductVariant(
                product_id=prod1.id,
                name="Standard Edition",
                sku="ERP-STD",
                additional_price=Decimal("0.00"),
                is_active=True
            )
            v2 = ProductVariant(
                product_id=prod1.id,
                name="Odoo Brand Edition",
                sku="ERP-ODOO",
                additional_price=Decimal("560.00"),
                is_active=True
            )
            db.add_all([v1, v2])
            print("Created product 'Brightloop ERP Cloud' with Standard & Odoo variants.")

        # 5. Seed Subscription Plans
        if prod1:
            plan1 = db.query(Plan).filter(Plan.name == "ERP Monthly Pro").first()
            if not plan1:
                plan1 = Plan(
                    name="ERP Monthly Pro",
                    description="Full cloud ERP access with monthly recurring billing",
                    product_id=prod1.id,
                    price=Decimal("1560.00"),
                    billing_frequency=BillingFrequency.MONTHLY,
                    minimum_quantity=1,
                    available_from=date(2026, 1, 1),
                    auto_close=False,
                    allow_early_closure=True,
                    allow_pause=True,
                    allow_renewal=True,
                    is_active=True
                )
                plan2 = Plan(
                    name="ERP Annual Enterprise",
                    description="Annual commitment with 20% discount included",
                    product_id=prod1.id,
                    price=Decimal("15000.00"),
                    billing_frequency=BillingFrequency.YEARLY,
                    minimum_quantity=1,
                    available_from=date(2026, 1, 1),
                    auto_close=False,
                    allow_early_closure=False,
                    allow_pause=True,
                    allow_renewal=True,
                    is_active=True
                )
                db.add_all([plan1, plan2])
                print("Created sample subscription plans.")

        db.commit()
        print("Database seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
