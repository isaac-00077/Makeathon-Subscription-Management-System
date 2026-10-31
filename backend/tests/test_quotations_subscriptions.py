import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from decimal import Decimal
from datetime import date, timedelta

from app.models.user import User, UserRole
from app.models.product import Product, ProductVariant
from app.models.plan import Plan, BillingFrequency
from app.models.quotation import Quotation, QuotationItem, QuotationStatus
from app.models.subscription import Subscription, SubscriptionItem, SubscriptionStatus
from app.models.invoice import Invoice
from app.core.security import get_password_hash, create_access_token
from app.services.quotation_service import QuotationService
from app.services.subscription_service import SubscriptionService

# Reuse test client and TestingSessionLocal for unified SQLite test database
from tests.test_person1 import client, TestingSessionLocal


@pytest.fixture(scope="module")
def setup_test_data():
    db = TestingSessionLocal()

    # 1. Unique users for quotation tests
    admin = User(
        email="admin_qs@brightloop.com",
        hashed_password=get_password_hash("AdminPass123!"),
        full_name="Admin Person",
        role=UserRole.ADMIN,
        is_active=True
    )
    staff = User(
        email="staff_qs@brightloop.com",
        hashed_password=get_password_hash("StaffPass123!"),
        full_name="Staff Person",
        role=UserRole.STAFF,
        is_active=True
    )
    cust1 = User(
        email="customer1_qs@acme.com",
        hashed_password=get_password_hash("CustPass123!"),
        full_name="Alice Customer",
        role=UserRole.CUSTOMER,
        is_active=True
    )
    cust2 = User(
        email="customer2_qs@globex.com",
        hashed_password=get_password_hash("CustPass123!"),
        full_name="Bob Customer",
        role=UserRole.CUSTOMER,
        is_active=True
    )
    db.add_all([admin, staff, cust1, cust2])
    db.flush()

    # 2. Product and Variants
    prod = Product(
        name="Brightloop ERP Software QS",
        sales_price=Decimal("1000.00"),
        cost_price=Decimal("300.00"),
        product_type="service",
        is_active=True
    )
    db.add(prod)
    db.flush()

    var = ProductVariant(
        product_id=prod.id,
        name="Odoo Brand Edition QS",
        additional_price=Decimal("560.00"),
        is_active=True
    )
    db.add(var)
    db.flush()

    # 3. Plan
    plan = Plan(
        name="ERP Monthly Pro Plan QS",
        product_id=prod.id,
        price=Decimal("1560.00"),
        billing_frequency=BillingFrequency.MONTHLY,
        minimum_quantity=1,
        available_from=date(2026, 1, 1),
        allow_pause=True,
        allow_early_closure=True,
        allow_renewal=True,
        is_active=True
    )
    db.add(plan)
    db.commit()

    user_ids = {
        "admin": admin.id,
        "staff": staff.id,
        "cust1": cust1.id,
        "cust2": cust2.id,
        "product_id": prod.id,
        "variant_id": var.id,
        "plan_id": plan.id,
    }
    db.close()
    return user_ids


def test_quotation_calculation_logic():
    items = [
        {"productId": 1, "quantity": 2, "unitPrice": 1000.00},
        {"productId": 2, "quantity": 1, "unitPrice": 560.00},
    ]
    # Subtotal = 2000 + 560 = 2560
    # Discount 10% = 256
    # Taxable = 2304
    # Tax 18% = 414.72
    # Grand Total = 2718.72
    calc = QuotationService.calculate_totals(
        items_data=items,
        discount_type="percentage",
        discount_value=Decimal("10.00"),
        tax_rate=Decimal("18.00")
    )
    assert calc["subtotal"] == Decimal("2560.00")
    assert calc["discount_amount"] == Decimal("256.00")
    assert calc["tax_amount"] == Decimal("414.72")
    assert calc["grand_total"] == Decimal("2718.72")


def test_quotation_crud_and_lifecycle(setup_test_data):
    staff_token = create_access_token(setup_test_data["staff"], "staff")
    headers = {"Authorization": f"Bearer {staff_token}"}

    # 1. Create quotation
    payload = {
        "customerId": setup_test_data["cust1"],
        "planId": setup_test_data["plan_id"],
        "template": "Enterprise Standard",
        "validityDate": (date.today() + timedelta(days=15)).isoformat(),
        "discountType": "percentage",
        "discountValue": 10,
        "taxRate": 18,
        "notes": "Testing quotation",
        "status": "draft",
        "items": [
            {
                "productId": setup_test_data["product_id"],
                "variantId": setup_test_data["variant_id"],
                "quantity": 1,
                "unitPrice": 1560.00,
            }
        ]
    }

    create_res = client.post("/api/v1/quotations", json=payload, headers=headers)
    assert create_res.status_code == 201, create_res.text
    data = create_res.json()
    assert data["quotationNumber"].startswith("QT-")
    assert data["status"] == "draft"
    q_id = data["id"]

    # 2. Send quotation
    send_res = client.post(f"/api/v1/quotations/{q_id}/send", headers=headers)
    assert send_res.status_code == 200
    assert send_res.json()["status"] == "sent"

    # 3. Customer views their own quotation
    cust1_token = create_access_token(setup_test_data["cust1"], "customer")
    cust1_headers = {"Authorization": f"Bearer {cust1_token}"}
    view_res = client.get(f"/api/v1/quotations/{q_id}", headers=cust1_headers)
    assert view_res.status_code == 200
    assert view_res.json()["id"] == q_id

    # 4. Another customer is blocked
    cust2_token = create_access_token(setup_test_data["cust2"], "customer")
    cust2_headers = {"Authorization": f"Bearer {cust2_token}"}
    blocked_res = client.get(f"/api/v1/quotations/{q_id}", headers=cust2_headers)
    assert blocked_res.status_code == 403

    # 5. Customer accepts quotation
    accept_res = client.post(f"/api/v1/quotations/{q_id}/accept", headers=cust1_headers)
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "accepted"


def test_quotation_conversion_to_subscription(setup_test_data):
    staff_token = create_access_token(setup_test_data["staff"], "staff")
    headers = {"Authorization": f"Bearer {staff_token}"}

    # Create & approve quote
    payload = {
        "customerId": setup_test_data["cust1"],
        "planId": setup_test_data["plan_id"],
        "validityDate": (date.today() + timedelta(days=30)).isoformat(),
        "discountType": "fixed",
        "discountValue": 60,
        "taxRate": 18,
        "status": "accepted",
        "items": [
            {
                "productId": setup_test_data["product_id"],
                "variantId": setup_test_data["variant_id"],
                "quantity": 2,
                "unitPrice": 1560.00,
            }
        ]
    }
    q_res = client.post("/api/v1/quotations", json=payload, headers=headers)
    assert q_res.status_code == 201
    q_data = q_res.json()
    q_id = q_data["id"]

    # Convert to subscription
    convert_res = client.post(f"/api/v1/quotations/{q_id}/convert-to-subscription", json={"paymentMethod": "Razorpay"}, headers=headers)
    assert convert_res.status_code == 200, convert_res.text
    conv_data = convert_res.json()
    assert "subscription" in conv_data
    assert "invoice" in conv_data
    sub_info = conv_data["subscription"]
    assert sub_info["subscriptionNumber"].startswith("SUB-")
    assert sub_info["status"] == "active"
    assert sub_info["customerId"] == setup_test_data["cust1"]

    # Verify invoice was generated
    inv_info = conv_data["invoice"]
    assert inv_info["invoiceNumber"].startswith("INV-")
    assert inv_info["subscriptionId"] == sub_info["id"]

    # Verify quotation is marked converted
    q_check = client.get(f"/api/v1/quotations/{q_id}", headers=headers)
    assert q_check.json()["status"] == "converted"
    assert q_check.json()["convertedSubscriptionId"] == sub_info["id"]


def test_subscription_lifecycle_operations(setup_test_data):
    staff_token = create_access_token(setup_test_data["staff"], "staff")
    headers = {"Authorization": f"Bearer {staff_token}"}

    # 1. Create Subscription
    sub_payload = {
        "customerId": setup_test_data["cust1"],
        "planId": setup_test_data["plan_id"],
        "paymentMethod": "UPI",
        "productLines": [
            {
                "productId": setup_test_data["product_id"],
                "variantId": setup_test_data["variant_id"],
                "quantity": 1,
                "unitPrice": 1560.00,
            }
        ]
    }
    create_sub = client.post("/api/v1/subscriptions", json=sub_payload, headers=headers)
    assert create_sub.status_code == 201
    sub = create_sub.json()
    sub_id = sub["id"]
    assert sub["status"] == "active"

    # 2. Pause Subscription
    pause_res = client.post(f"/api/v1/subscriptions/{sub_id}/pause", json={"reason": "Customer going on vacation"}, headers=headers)
    assert pause_res.status_code == 200
    assert pause_res.json()["status"] == "paused"

    # 3. Resume Subscription
    resume_res = client.post(f"/api/v1/subscriptions/{sub_id}/resume", headers=headers)
    assert resume_res.status_code == 200
    assert resume_res.json()["status"] == "active"

    # 4. Renew Subscription
    renew_res = client.post(f"/api/v1/subscriptions/{sub_id}/renew", headers=headers)
    assert renew_res.status_code == 200
    assert renew_res.json()["status"] == "active"

    # 5. Close Subscription
    close_res = client.post(f"/api/v1/subscriptions/{sub_id}/close", json={"reason": "Completed contract term"}, headers=headers)
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "closed"
