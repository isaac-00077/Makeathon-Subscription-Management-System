import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, ArrowLeft, Layers, DollarSign, Tag, Check, Save } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Select } from '../../components/common/Select'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { productService } from '../../services/productService'
import { useNotification } from '../../context/NotificationContext'
import { formatCurrency } from '../../utils/formatters'

const productSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  code: z.string().min(2, 'Product code is required'),
  sku: z.string().min(2, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  basePrice: z.coerce.number().min(0, 'Base price must be a non-negative number'),
  availability: z.enum(['in_stock', 'out_of_stock']),
  status: z.enum(['active', 'archived', 'draft']),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1, 'Variant name required'),
        sku: z.string().min(1, 'Variant SKU required'),
        additionalPrice: z.coerce.number().min(0, 'Additional price must be 0 or more'),
        stock: z.coerce.number().min(0, 'Stock must be non-negative'),
      })
    )
    .optional(),
})

export function ProductForm() {
  const { id } = useParams()
  const isEditMode = Boolean(id && id !== 'create')
  const navigate = useNavigate()
  const { showSuccess, showError } = useNotification()
  const [isLoading, setIsLoading] = useState(isEditMode)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      code: '',
      sku: '',
      category: 'Software',
      description: '',
      basePrice: 0,
      availability: 'in_stock',
      status: 'active',
      variants: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variants',
  })

  const basePriceWatched = watch('basePrice') || 0

  useEffect(() => {
    async function fetchProduct() {
      if (!isEditMode) return
      try {
        const prod = await productService.getProductById(id)
        reset(prod)
      } catch (err) {
        showError('Product not found.')
        navigate('/admin/products')
      } finally {
        setIsLoading(false)
      }
    }
    fetchProduct()
  }, [id, isEditMode])

  const onSubmit = async (data) => {
    setIsSubmitting(true)
    try {
      if (isEditMode) {
        await productService.updateProduct(id, data)
        showSuccess('Product and variants updated successfully!')
      } else {
        await productService.createProduct(data)
        showSuccess('New product published to catalog!')
      }
      navigate('/admin/products')
    } catch (err) {
      showError(err.message || 'Error saving product.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const addVariantItem = () => {
    append({
      id: `var_${Date.now()}`,
      name: '',
      sku: '',
      additionalPrice: 0,
      stock: 50,
    })
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading product configurations..." />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEditMode ? 'Edit Product & Variants' : 'Create New Catalog Product'}
        description="Configure product specifications, base billing rates, and multi-tier variant offerings"
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Products', href: '/admin/products' },
          { label: isEditMode ? 'Edit' : 'Create' },
        ]}
        actions={
          <Link to="/admin/products">
            <Button variant="outline" size="sm" icon={ArrowLeft}>
              Back to Catalog
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Core Product Information Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
            Core Specifications
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Product Title"
              placeholder="e.g. CloudSync Enterprise Platform"
              error={errors.name?.message}
              required
              {...register('name')}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Product Code"
                placeholder="e.g. CS-ENT-01"
                error={errors.code?.message}
                required
                {...register('code')}
              />
              <Input
                label="Master SKU"
                placeholder="e.g. SKU-CS-001"
                error={errors.sku?.message}
                required
                {...register('sku')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select label="Category" error={errors.category?.message} {...register('category')}>
              <option value="Software">Software</option>
              <option value="Security">Security</option>
              <option value="Analytics">Analytics</option>
              <option value="Services">Services</option>
              <option value="Hardware">Hardware</option>
            </Select>

            <Input
              label="Base Unit Price ($)"
              type="number"
              step="0.01"
              placeholder="299.00"
              error={errors.basePrice?.message}
              required
              {...register('basePrice')}
            />

            <Select label="Availability Status" {...register('availability')}>
              <option value="in_stock">In Stock / Available</option>
              <option value="out_of_stock">Out of Stock</option>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Product Description & Service Scope
            </label>
            <textarea
              rows={3}
              placeholder="Detailed description of features, cloud SLAs, and capabilities included in base offering..."
              className="block w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register('description')}
            />
          </div>
        </div>

        {/* Product Variant Management Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                Product Variants & Additional Pricing
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure editions, capacity upgrades, or SLA tiers that add to the base price of {formatCurrency(basePriceWatched)}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" icon={Plus} onClick={addVariantItem}>
              Add Variant Tier
            </Button>
          </div>

          {fields.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No custom variants created</p>
              <p className="text-xs text-slate-400 mt-0.5 max-w-sm mx-auto">
                This item will sell at standard base price. Click &quot;Add Variant Tier&quot; to configure pricing tiers (e.g. Standard, Pro, Enterprise).
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => {
                const addPrice = watch(`variants.${index}.additionalPrice`) || 0
                const computedTotal = Number(basePriceWatched) + Number(addPrice)

                return (
                  <div
                    key={field.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col md:flex-row items-center gap-4 transition hover:border-slate-300"
                  >
                    <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <Input
                        label="Variant Name"
                        placeholder="e.g. Pro 15TB Tier"
                        error={errors.variants?.[index]?.name?.message}
                        required
                        {...register(`variants.${index}.name`)}
                      />
                      <Input
                        label="Variant SKU"
                        placeholder="e.g. SKU-PRO-15TB"
                        error={errors.variants?.[index]?.sku?.message}
                        required
                        {...register(`variants.${index}.sku`)}
                      />
                      <Input
                        label="Addl. Price ($)"
                        type="number"
                        step="0.01"
                        placeholder="150.00"
                        error={errors.variants?.[index]?.additionalPrice?.message}
                        {...register(`variants.${index}.additionalPrice`)}
                      />
                      <Input
                        label="Inventory Allotment"
                        type="number"
                        placeholder="50"
                        {...register(`variants.${index}.stock`)}
                      />
                    </div>

                    {/* Calculated Final Price Badge */}
                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end pt-2 md:pt-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Unit Cost</span>
                        <span className="text-sm font-extrabold text-blue-700">
                          {formatCurrency(computedTotal)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Remove Variant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link to="/admin/products">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" variant="primary" icon={Save} isLoading={isSubmitting}>
            {isEditMode ? 'Update Product' : 'Save & Publish Product'}
          </Button>
        </div>
      </form>
    </div>
  )
}
