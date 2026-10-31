from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.products import router as products_router
from app.api.v1.plans import router as plans_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users_router, prefix="/users", tags=["Users & Staff"])
api_router.include_router(products_router, prefix="/products", tags=["Products & Variants"])
api_router.include_router(plans_router, prefix="/plans", tags=["Subscription Plans"])
