from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.customers import router as customers_router
from app.api.v1.products import router as products_router
from app.api.v1.plans import router as plans_router
from app.api.v1.quotations import router as quotations_router
from app.api.v1.subscriptions import router as subscriptions_router
from app.api.v1.invoices import router as invoices_router
from app.api.v1.taxes import router as taxes_router
from app.api.v1.discounts import router as discounts_router
from app.api.v1.payments import router as payments_router
from app.api.v1.dashboards import router as dashboards_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users_router, prefix="/users", tags=["Users & Staff"])
api_router.include_router(customers_router, prefix="/customers", tags=["Customers"])
api_router.include_router(products_router, prefix="/products", tags=["Products & Variants"])
api_router.include_router(plans_router, prefix="/plans", tags=["Subscription Plans"])
api_router.include_router(quotations_router, prefix="/quotations", tags=["Quotations & Templates"])
api_router.include_router(subscriptions_router, prefix="/subscriptions", tags=["Subscriptions"])
api_router.include_router(invoices_router, prefix="/invoices", tags=["Invoices & Billing"])
api_router.include_router(taxes_router, prefix="/taxes", tags=["Taxes"])
api_router.include_router(discounts_router, prefix="/discounts", tags=["Discounts"])
api_router.include_router(payments_router, prefix="/payments", tags=["Payments & Gateway"])
api_router.include_router(dashboards_router, prefix="/dashboards", tags=["Dashboards & Analytics"])
# Also support /dashboard alias (singular) for frontend compatibility
api_router.include_router(dashboards_router, prefix="/dashboard", tags=["Dashboards & Analytics"])
