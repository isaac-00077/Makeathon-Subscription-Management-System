import React, { useState, useEffect } from 'react'
import {
  Plus,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  Repeat,
  Eye,
  Trash2,
  Search,
  ExternalLink,
  DollarSign,
  Layers,
} from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Select } from '../../components/common/Select'
import { SearchBar } from '../../components/common/SearchBar'
import { StatusBadge } from '../../components/common/StatusBadge'
import { Modal } from '../../components/common/Modal'
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { EmptyState } from '../../components/common/EmptyState'
import { quotationService } from '../../services/quotationService'
import { userService } from '../../services/userService'
import { productService } from '../../services/productService'
import { planService } from '../../services/planService'
import { useNotification } from '../../context/NotificationContext'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency, formatDate } from '../../utils/formatters'

export function QuotationList() {
  const { role } = useAuth()
  const { showSuccess, showError, showInfo } = useNotification()
  const [quotations, setQuotations] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [plans, setPlans] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewingQuotation, setViewingQuotation] = useState(null)
  const [convertQuotation, setConvertQuotation] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, control, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      customerId: '',
      template: 'Enterprise Standard',
      issueDate: new Date().toISOString().split('T')[0],
      validityDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      items: [],
      discountType: 'percentage',
      discountValue: 0,
      taxRate: 18,
      notes: 'Terms: 30 days net from invoice date upon conversion.',
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [quotData, custList, prodList, planList] = await Promise.all([
        quotationService.getQuotations({ search, status: statusFilter }),
        userService.getCustomers(),
        productService.getProducts(),
        planService.getPlans(),
      ])
      setQuotations(quotData)
      setCustomers(custList)
      setProducts(prodList)
      setPlans(planList)
    } catch (err) {
      showError('Error loading quotation data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [search, statusFilter])

  // Watch items and discounts to compute live quotation subtotal and grand total
  const watchedItems = watch('items') || []
  const watchedDiscountType = watch('discountType')
  const watchedDiscountVal = Number(watch('discountValue')) || 0
  const watchedTaxRate = Number(watch('taxRate')) || 0

  const computedSubtotal = watchedItems.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0
    const price = Number(item.unitPrice) || 0
    return acc + qty * price
  }, 0)

  let computedDiscount = 0
  if (watchedDiscountType === 'percentage') {
    computedDiscount = (computedSubtotal * watchedDiscountVal) / 100
  } else {
    computedDiscount = Math.min(watchedDiscountVal, computedSubtotal)
  }

  const taxableAmount = Math.max(0, computedSubtotal - computedDiscount)
  const computedTax = (taxableAmount * watchedTaxRate) / 100
  const computedGrandTotal = taxableAmount + computedTax

  const openCreateModal = () => {
    reset({
      customerId: customers[0]?.id || '',
      template: 'Enterprise Standard',
      issueDate: new Date().toISOString().split('T')[0],
      validityDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      items: [
        {
          productId: products[0]?.id || '',
          productName: products[0]?.name || '',
          variantId: products[0]?.variants?.[0]?.id || 'std',
          variantName: products[0]?.variants?.[0]?.name || 'Standard Edition',
          quantity: 1,
          unitPrice: products[0]?.basePrice || 100,
          totalPrice: products[0]?.basePrice || 100,
        },
      ],
      discountType: 'percentage',
      discountValue: 0,
      taxRate: 18,
      notes: 'Terms: 30 days net upon conversion to active subscription.',
    })
    setIsCreateOpen(true)
  }

  const handleProductSelect = (index, prodId) => {
    const prod = products.find((p) => p.id === prodId)
    if (!prod) return
    const firstVar = prod.variants?.[0]
    const price = prod.basePrice + (firstVar?.additionalPrice || 0)
    setValue(`items.${index}.productId`, prod.id)
    setValue(`items.${index}.productName`, prod.name)
    setValue(`items.${index}.variantId`, firstVar?.id || 'std')
    setValue(`items.${index}.variantName`, firstVar?.name || 'Standard Edition')
    setValue(`items.${index}.unitPrice`, price)
    setValue(`items.${index}.totalPrice`, price * (watchedItems[index]?.quantity || 1))
  }

  const handleVariantSelect = (index, variantId) => {
    const currentProdId = watchedItems[index]?.productId
    const prod = products.find((p) => p.id === currentProdId)
    if (!prod) return
    const variant = prod.variants?.find((v) => v.id === variantId)
    const price = prod.basePrice + (variant?.additionalPrice || 0)
    setValue(`items.${index}.variantId`, variantId)
    setValue(`items.${index}.variantName`, variant?.name || 'Standard Edition')
    setValue(`items.${index}.unitPrice`, price)
    setValue(`items.${index}.totalPrice`, price * (watchedItems[index]?.quantity || 1))
  }

  const handleAddItem = () => {
    const prod = products[0]
    const firstVar = prod?.variants?.[0]
    const price = (prod?.basePrice || 100) + (firstVar?.additionalPrice || 0)
    append({
      productId: prod?.id || '',
      productName: prod?.name || '',
      variantId: firstVar?.id || 'std',
      variantName: firstVar?.name || 'Standard Edition',
      quantity: 1,
      unitPrice: price,
      totalPrice: price,
    })
  }

  const onSubmit = async (data) => {
    setIsSubmitting(true)
    try {
      const customer = customers.find((c) => c.id === data.customerId)
      const payload = {
        ...data,
        customerName: customer ? `${customer.name} (${customer.company || 'Direct'})` : 'Valued Client',
        customerEmail: customer?.email || '',
        subtotal: computedSubtotal,
        discountAmount: computedDiscount,
        taxAmount: computedTax,
        grandTotal: computedGrandTotal,
        items: data.items.map((i) => ({
          ...i,
          totalPrice: (Number(i.quantity) || 1) * (Number(i.unitPrice) || 0),
        })),
        status: 'sent',
      }

      await quotationService.createQuotation(payload)
      showSuccess('Quotation generated and marked sent!')
      setIsCreateOpen(false)
      loadData()
    } catch (err) {
      showError(err.message || 'Failed to create quotation.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSend = async (q) => {
    try {
      await quotationService.sendQuotation(q.id)
      showSuccess(`Quotation ${q.quotationNumber} dispatched to customer email.`)
      loadData()
    } catch (err) {
      showError('Failed to send quotation.')
    }
  }

  const handleApprove = async (q) => {
    try {
      await quotationService.approveQuotation(q.id)
      showSuccess(`Quotation ${q.quotationNumber} approved! Ready for subscription conversion.`)
      loadData()
    } catch (err) {
      showError('Failed to approve.')
    }
  }

  const handleConvertToSubscription = async (q) => {
    try {
      setIsSubmitting(true)
      const res = await quotationService.convertToSubscription(q.id)
      showSuccess(`Success! Converted into Subscription #${res.subscription.subscriptionNumber}`)
      setViewingQuotation(null)
      setConvertQuotation(null)
      loadData()
    } catch (err) {
      showError(err.message || 'Failed to convert quotation to subscription.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotation Management"
        description="Build formal pricing proposals, configure template terms, and convert approved quotes to active subscriptions"
        breadcrumbs={[
          { label: 'Dashboard', href: `/${role}/dashboard` },
          { label: 'Quotations' },
        ]}
        actions={
          <Button variant="primary" size="sm" icon={Plus} onClick={openCreateModal}>
            Create Quotation
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search quotation # or client..."
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs font-semibold rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 shadow-sm w-full sm:w-auto"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Drafts</option>
          <option value="sent">Sent to Client</option>
          <option value="approved">Approved</option>
          <option value="converted">Converted to Subscription</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Quotations Table */}
      {isLoading ? (
        <LoadingSpinner message="Loading quotation proposals..." />
      ) : quotations.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No quotations found"
          description="Create a proposal with customized product line items and discount terms."
          actionLabel="Create Quotation"
          onAction={openCreateModal}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Quotation #</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Template</th>
                  <th className="px-6 py-4">Issue / Valid Till</th>
                  <th className="px-6 py-4">Grand Total</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="font-bold text-slate-900">{q.quotationNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{q.customerName}</p>
                      <p className="text-[11px] text-slate-500">{q.customerEmail}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{q.template}</td>
                    <td className="px-6 py-4 text-slate-500">
                      <span>{formatDate(q.issueDate)}</span>
                      <span className="block text-[11px] text-slate-400">Exp: {formatDate(q.validityDate)}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {formatCurrency(q.grandTotal)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={q.status} />
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5">
                      <button
                        onClick={() => setViewingQuotation(q)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition"
                        title="View Quotation Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {q.status === 'draft' && (
                        <button
                          onClick={() => handleSend(q)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                          title="Send to Customer"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}

                      {q.status === 'sent' && (
                        <button
                          onClick={() => handleApprove(q)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition"
                          title="Mark Customer Approved"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}

                      {(q.status === 'approved' || q.status === 'sent') && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Repeat}
                          onClick={() => setConvertQuotation(q)}
                          className="text-xs"
                        >
                          Convert to Sub
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quotation Detail Modal */}
      {viewingQuotation && (
        <Modal
          isOpen={!!viewingQuotation}
          onClose={() => setViewingQuotation(null)}
          title={`Quotation Proposal ${viewingQuotation.quotationNumber}`}
          description={`Issued to ${viewingQuotation.customerName} on ${formatDate(viewingQuotation.issueDate)}`}
          maxWidth="max-w-2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <StatusBadge status={viewingQuotation.status} />
              <div className="flex gap-2">
                {viewingQuotation.status !== 'converted' && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Repeat}
                    onClick={() => handleConvertToSubscription(viewingQuotation)}
                    isLoading={isSubmitting}
                  >
                    Convert into Subscription
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setViewingQuotation(null)}>
                  Close
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Header meta */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-slate-400 block font-semibold uppercase">Customer</span>
                <span className="font-bold text-slate-900 text-sm">{viewingQuotation.customerName}</span>
                <span className="block text-slate-500">{viewingQuotation.customerEmail}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block font-semibold uppercase">Validity</span>
                <span className="text-slate-700">Valid until {formatDate(viewingQuotation.validityDate)}</span>
                <span className="block text-slate-500">Template: {viewingQuotation.template}</span>
              </div>
            </div>

            {/* Line items table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-3">Product & Variant</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">Unit Rate</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewingQuotation.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-semibold text-slate-900">
                        {it.productName}
                        <span className="block text-[11px] text-slate-500 font-normal">{it.variantName}</span>
                      </td>
                      <td className="p-3">{it.quantity}</td>
                      <td className="p-3">{formatCurrency(it.unitPrice)}</td>
                      <td className="p-3 text-right font-bold">{formatCurrency(it.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculation summary */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-1.5 border border-slate-200 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal:</span>
                <span className="text-slate-800">{formatCurrency(viewingQuotation.subtotal)}</span>
              </div>
              {viewingQuotation.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount Applied:</span>
                  <span>-{formatCurrency(viewingQuotation.discountAmount)}</span>
                </div>
              )}
              {viewingQuotation.taxAmount > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Taxes ({viewingQuotation.taxRate}%):</span>
                  <span>+{formatCurrency(viewingQuotation.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-extrabold text-slate-900">
                <span>Grand Total:</span>
                <span className="text-blue-700">{formatCurrency(viewingQuotation.grandTotal)}</span>
              </div>
            </div>

            {viewingQuotation.notes && (
              <p className="text-slate-500 italic">Notes: {viewingQuotation.notes}</p>
            )}
          </div>
        </Modal>
      )}

      {/* Convert to Subscription Confirmation Modal */}
      {convertQuotation && (
        <ConfirmationDialog
          isOpen={!!convertQuotation}
          onClose={() => setConvertQuotation(null)}
          onConfirm={() => handleConvertToSubscription(convertQuotation)}
          title="Convert Quotation to Subscription"
          message={`Convert proposal "${convertQuotation.quotationNumber}" into an active subscription for ${convertQuotation.customerName}? An invoice for ${formatCurrency(convertQuotation.grandTotal)} will be automatically scheduled.`}
          confirmText="Confirm & Convert"
          variant="primary"
          isLoading={isSubmitting}
        />
      )}

      {/* Create Quotation Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Quotation"
        description="Select customer, add products with custom variants, apply discounts and calculate total."
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Select Customer" required {...register('customerId', { required: true })}>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.company || 'Direct'})
                </option>
              ))}
            </Select>

            <Select label="Quotation Template" {...register('template')}>
              <option value="Enterprise Standard">Enterprise Standard</option>
              <option value="SaaS Expansion Tier">SaaS Expansion Tier</option>
              <option value="Custom Project Agreement">Custom Project Agreement</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Issue Date" type="date" required {...register('issueDate')} />
            <Input label="Validity Date" type="date" required {...register('validityDate')} />
          </div>

          {/* Line items builder */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900">Quotation Line Items</h4>
              <Button type="button" variant="outline" size="sm" icon={Plus} onClick={handleAddItem}>
                Add Item
              </Button>
            </div>

            {fields.map((field, idx) => {
              const currentProdId = watch(`items.${idx}.productId`)
              const currentProd = products.find((p) => p.id === currentProdId)

              return (
                <div key={field.id} className="p-3 bg-white rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-4">
                    <Select
                      label="Product"
                      value={currentProdId}
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="sm:col-span-3">
                    <Select
                      label="Variant"
                      value={watch(`items.${idx}.variantId`)}
                      onChange={(e) => handleVariantSelect(idx, e.target.value)}
                    >
                      {currentProd?.variants?.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} (+${v.additionalPrice})
                        </option>
                      )) || <option value="std">Standard</option>}
                    </Select>
                  </div>

                  <div className="sm:col-span-2">
                    <Input
                      label="Qty"
                      type="number"
                      min="1"
                      {...register(`items.${idx}.quantity`, {
                        onChange: (e) => {
                          const qty = Number(e.target.value) || 1
                          const rate = watchedItems[idx]?.unitPrice || 0
                          setValue(`items.${idx}.totalPrice`, qty * rate)
                        },
                      })}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <span className="block text-xs font-semibold text-slate-700 mb-1">Line Total</span>
                    <span className="block text-sm font-bold text-blue-700 py-1.5">
                      {formatCurrency(
                        (Number(watch(`items.${idx}.quantity`)) || 1) *
                          (Number(watch(`items.${idx}.unitPrice`)) || 0)
                      )}
                    </span>
                  </div>

                  <div className="sm:col-span-1 pt-4 text-right">
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Discounts & Taxes Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select label="Discount Type" {...register('discountType')}>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount ($)</option>
            </Select>

            <Input
              label="Discount Value"
              type="number"
              step="0.01"
              placeholder="0"
              {...register('discountValue')}
            />

            <Input
              label="Tax Rate (%)"
              type="number"
              step="0.1"
              placeholder="18"
              {...register('taxRate')}
            />
          </div>

          {/* Computed Summary Banner */}
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-slate-600">Subtotal: {formatCurrency(computedSubtotal)}</span>
              <span className="block text-emerald-700">Discount: -{formatCurrency(computedDiscount)}</span>
              <span className="block text-slate-600">Taxes: +{formatCurrency(computedTax)}</span>
            </div>
            <div className="text-right">
              <span className="text-xs uppercase font-bold text-slate-500 block">Total Calculated</span>
              <span className="text-2xl font-extrabold text-blue-700">
                {formatCurrency(computedGrandTotal)}
              </span>
            </div>
          </div>

          <Input label="Notes & Terms" placeholder="Enter terms of validity or service deliverables..." {...register('notes')} />

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Generate Quotation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
