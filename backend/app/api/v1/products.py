from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.product import Product, ProductVariant
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductDetailResponse,
    ProductVariantCreate,
    ProductVariantUpdate,
    ProductVariantResponse,
)
from app.api.deps import require_admin, require_staff_or_admin

router = APIRouter()


# -------------------------------------------------------------
# Products CRUD
# -------------------------------------------------------------

@router.get("/", response_model=List[ProductResponse])
def list_products(
    search: Optional[str] = Query(None, description="Search products by name or notes"),
    product_type: Optional[str] = Query(None, description="Filter by product type"),
    is_active: Optional[bool] = Query(True, description="Filter by active status (defaults to True)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    List all products with search, type filter, and pagination.
    Available to all authenticated users (and public/catalog if needed).
    """
    query = db.query(Product)

    if is_active is not None:
        query = query.filter(Product.is_active == is_active)

    if product_type:
        query = query.filter(Product.product_type == product_type)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(search_filter),
                Product.notes.ilike(search_filter)
            )
        )

    products = query.order_by(Product.name.asc()).offset(skip).limit(limit).all()
    return products


@router.post("/", response_model=ProductDetailResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    """
    Create a new product. Admin only.
    """
    product = Product(
        name=product_in.name,
        product_type=product_in.product_type,
        sales_price=product_in.sales_price,
        cost_price=product_in.cost_price,
        notes=product_in.notes,
        is_active=product_in.is_active
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/{product_id}", response_model=ProductDetailResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    """
    Get product details including all variants and their calculated prices.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    # Attach computed final_price to each variant response
    variant_responses = []
    for v in product.variants:
        v_resp = ProductVariantResponse.model_validate(v)
        v_resp.final_price = product.sales_price + v.additional_price
        variant_responses.append(v_resp)

    resp = ProductDetailResponse.model_validate(product)
    resp.variants = variant_responses
    return resp


@router.put("/{product_id}", response_model=ProductDetailResponse)
def update_product(
    product_id: int,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    """
    Update an existing product. Admin only.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    update_data = product_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return get_product(product_id=product.id, db=db)


@router.delete("/{product_id}", status_code=status.HTTP_200_OK)
def archive_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    """
    Archive / soft-delete a product. Admin only.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    product.is_active = False
    db.commit()
    return {"message": f"Product '{product.name}' archived successfully."}


# -------------------------------------------------------------
# Product Variants CRUD
# -------------------------------------------------------------

@router.get("/{product_id}/variants", response_model=List[ProductVariantResponse])
def list_variants(
    product_id: int,
    is_active: Optional[bool] = Query(True),
    db: Session = Depends(get_db)
):
    """
    List variants of a product with their computed total prices.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    query = db.query(ProductVariant).filter(ProductVariant.product_id == product_id)
    if is_active is not None:
        query = query.filter(ProductVariant.is_active == is_active)

    variants = query.order_by(ProductVariant.name.asc()).all()
    results = []
    for v in variants:
        v_resp = ProductVariantResponse.model_validate(v)
        v_resp.final_price = product.sales_price + v.additional_price
        results.append(v_resp)

    return results


@router.post("/{product_id}/variants", response_model=ProductVariantResponse, status_code=status.HTTP_201_CREATED)
def create_variant(
    product_id: int,
    variant_in: ProductVariantCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    """
    Add a variant to a product with additional pricing. Admin only.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    variant = ProductVariant(
        product_id=product_id,
        name=variant_in.name,
        sku=variant_in.sku,
        additional_price=variant_in.additional_price,
        is_active=variant_in.is_active
    )
    db.add(variant)
    db.commit()
    db.refresh(variant)

    resp = ProductVariantResponse.model_validate(variant)
    resp.final_price = product.sales_price + variant.additional_price
    return resp


@router.put("/{product_id}/variants/{variant_id}", response_model=ProductVariantResponse)
def update_variant(
    product_id: int,
    variant_id: int,
    variant_in: ProductVariantUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    """
    Update a variant. Admin only.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    variant = db.query(ProductVariant).filter(
        ProductVariant.id == variant_id,
        ProductVariant.product_id == product_id
    ).first()
    if not variant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product variant not found")

    update_data = variant_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(variant, field, value)

    db.commit()
    db.refresh(variant)

    resp = ProductVariantResponse.model_validate(variant)
    resp.final_price = product.sales_price + variant.additional_price
    return resp


@router.delete("/{product_id}/variants/{variant_id}", status_code=status.HTTP_200_OK)
def delete_variant(
    product_id: int,
    variant_id: int,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    """
    Delete a variant. Admin only.
    """
    variant = db.query(ProductVariant).filter(
        ProductVariant.id == variant_id,
        ProductVariant.product_id == product_id
    ).first()
    if not variant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product variant not found")

    db.delete(variant)
    db.commit()
    return {"message": "Variant deleted successfully."}
