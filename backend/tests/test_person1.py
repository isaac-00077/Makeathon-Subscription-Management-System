import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from decimal import Decimal
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.core.security import (
    validate_password_strength,
    get_password_hash,
    verify_password,
    create_access_token,
    decode_access_token,
)
from app.models.user import User, UserRole

# Use in-memory SQLite for self-contained unit testing of Person 1 logic
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine_test = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)

Base.metadata.create_all(bind=engine_test)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_password_strength_validator():
    # Too short
    valid, msg = validate_password_strength("Short1!")
    assert not valid
    assert "8 characters" in msg

    # Missing uppercase
    valid, msg = validate_password_strength("lowercase123!")
    assert not valid
    assert "uppercase" in msg

    # Missing lowercase
    valid, msg = validate_password_strength("UPPERCASE123!")
    assert not valid
    assert "lowercase" in msg

    # Missing special character
    valid, msg = validate_password_strength("NoSpecialChar123")
    assert not valid
    assert "special character" in msg

    # Valid
    valid, msg = validate_password_strength("StrongPass123#")
    assert valid
    assert msg == ""


def test_argon2_hashing():
    raw = "MySuperSecret123$"
    hashed = get_password_hash(raw)
    assert hashed != raw
    assert "$argon2id$" in hashed
    assert verify_password(raw, hashed)
    assert not verify_password("WrongPass123$", hashed)


def test_jwt_token_creation_and_decoding():
    token = create_access_token(subject=42, role="admin")
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "42"
    assert payload["role"] == "admin"


def test_customer_registration_and_login():
    # Register customer
    reg_payload = {
        "email": "jane.doe@example.com",
        "password": "ValidPassword123!",
        "full_name": "Jane Doe",
        "phone": "+919876543210"
    }
    response = client.post("/api/v1/auth/register", json=reg_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "jane.doe@example.com"
    assert data["role"] == "customer"
    assert data["is_active"] is True

    # Duplicate registration should fail
    dup_response = client.post("/api/v1/auth/register", json=reg_payload)
    assert dup_response.status_code == 400

    # Login
    login_response = client.post("/api/v1/auth/login", json={
        "email": "jane.doe@example.com",
        "password": "ValidPassword123!"
    })
    assert login_response.status_code == 200
    token_data = login_response.json()
    assert "access_token" in token_data
    access_token = token_data["access_token"]

    # Access /auth/me with Bearer token
    me_response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "jane.doe@example.com"


def test_product_and_variant_flow():
    # Create an admin user directly in the test db
    db = TestingSessionLocal()
    admin_user = User(
        email="admin_test@brightloop.com",
        hashed_password=get_password_hash("AdminTest123!"),
        full_name="Admin Test",
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    admin_token = create_access_token(subject=admin_user.id, role="admin")

    # Create product as admin
    prod_payload = {
        "name": "Cloud CRM Suite",
        "product_type": "software",
        "sales_price": "1000.00",
        "cost_price": "250.00",
        "notes": "Base CRM subscription",
        "is_active": True
    }
    prod_resp = client.post(
        "/api/v1/products/",
        json=prod_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert prod_resp.status_code == 201
    prod_data = prod_resp.json()
    product_id = prod_data["id"]
    assert prod_data["sales_price"] == "1000.00"

    # Add variant to product (Odoo Brand +560.00 -> 1560.00)
    var_payload = {
        "name": "Odoo Brand Edition",
        "sku": "CRM-ODOO",
        "additional_price": "560.00",
        "is_active": True
    }
    var_resp = client.post(
        f"/api/v1/products/{product_id}/variants",
        json=var_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert var_resp.status_code == 201
    var_data = var_resp.json()
    assert var_data["additional_price"] == "560.00"
    assert var_data["final_price"] == "1560.00"

    # Get product detail and check variant inclusion
    detail_resp = client.get(f"/api/v1/products/{product_id}")
    assert detail_resp.status_code == 200
    detail_data = detail_resp.json()
    assert len(detail_data["variants"]) == 1
    assert detail_data["variants"][0]["final_price"] == "1560.00"

    # Create Plan linked to Product
    plan_payload = {
        "name": "CRM Monthly Pro Plan",
        "description": "Monthly recurring CRM license",
        "product_id": product_id,
        "price": "1560.00",
        "billing_frequency": "monthly",
        "minimum_quantity": 1,
        "available_from": str(date.today()),
        "auto_close": False,
        "allow_early_closure": True,
        "allow_pause": True,
        "allow_renewal": True,
        "is_active": True
    }
    plan_resp = client.post(
        "/api/v1/plans/",
        json=plan_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert plan_resp.status_code == 201
    plan_data = plan_resp.json()
    assert plan_data["name"] == "CRM Monthly Pro Plan"
    assert plan_data["billing_frequency"] == "monthly"
    assert plan_data["price"] == "1560.00"
