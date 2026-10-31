import React, { useState, useEffect } from 'react'
import { Plus, Percent, Edit, Trash2, Calendar, CheckCircle2, XCircle, Search, Tag } from 'lucide-react'
import { useForm } from 'react-hook-form'
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
import { discountService } from '../../services/discountService'
import { useNotification } from '../../context/NotificationContext'
import { formatCurrency, formatDate } from '../../utils/formatters'

export function DiscountList() {
  const { showSuccess, showError } = useNotification()
  const [discounts, setDiscounts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState(null)
  const [deleteConfirmDiscount, setDeleteConfirmDiscount] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, reset } = useForm()

  const loadDiscounts = async () => {
    try {
      setIsLoading(true)
      const data = await discountService.getDiscounts({ search, type: typeFilter })
      setDiscounts(data)
    } catch (err) {
      showError('Failed to load discounts.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDiscounts()
  }, [search, typeFilter])

  const openCreateModal = () => {
    setEditingDiscount(null)
    reset({
      code: '',
      name: '',
      type: 'percentage',
      value: 10,
      minPurchase: 0,
      minQuantity: 1,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      usageLimit: 100,
      status: 'active',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (d) => {
    setEditingDiscount(d)
    reset({
      code: d.code,
      name: d.name,
      type: d.type,
      value: d.value,
      minPurchase: d.minPurchase,
      minQuantity: d.minQuantity || 1,
      startDate: d.startDate,
      endDate: d.endDate,
      usageLimit: d.usageLimit,
      status: d.status,
    })
    setIsModalOpen(true)
  }

  const onSubmit = async (formData) => {
    setIsSubmitting(true)
    try {
      if (editingDiscount) {
        await discountService.updateDiscount(editingDiscount.id, formData)
        showSuccess('Discount promotion updated successfully!')
      } else {
        await discountService.createDiscount(formData)
        showSuccess('New discount code generated!')
      }
      setIsModalOpen(false)
      loadDiscounts()
    } catch (err) {
      showError(err.message || 'Error saving discount.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirmDiscount) return
    try {
      await discountService.deleteDiscount(deleteConfirmDiscount.id)
      showSuccess('Discount rule deleted.')
      setDeleteConfirmDiscount(null)
      loadDiscounts()
    } catch (err) {
      showError('Failed to delete discount.')
    }
  }

  const handleToggleStatus = async (d) => {
    try {
      await discountService.toggleDiscountStatus(d.id)
      showSuccess(`Discount toggled to ${d.status === 'active' ? 'inactive' : 'active'}`)
      loadDiscounts()
    } catch (err) {
      showError('Failed to toggle status.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discount Promotions"
        description="Coupon campaigns, volume discounts, threshold rules, and usage quota governance"
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Discounts' },
        ]}
        actions={
          <Button variant="primary" size="sm" icon={Plus} onClick={openCreateModal}>
            Create Discount
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search discount code or campaign title..."
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-xs font-semibold rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 shadow-sm w-full sm:w-auto"
        >
          <option value="all">All Discount Types</option>
          <option value="percentage">Percentage (%)</option>
          <option value="fixed">Fixed Amount ($)</option>
        </select>
      </div>

      {/* Discounts Table */}
      {isLoading ? (
        <LoadingSpinner message="Fetching discount promotions..." />
      ) : discounts.length === 0 ? (
        <EmptyState
          icon={Percent}
          title="No discounts configured"
          description="Create promo codes or percentage discounts for clients and quotations."
          actionLabel="Create Discount"
          onAction={openCreateModal}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Promo Code & Name</th>
                  <th className="px-6 py-4">Discount Value</th>
                  <th className="px-6 py-4">Conditions</th>
                  <th className="px-6 py-4">Active Schedule</th>
                  <th className="px-6 py-4">Usage / Quota</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {discounts.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold flex-shrink-0">
                          <Tag className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-mono font-bold text-slate-900 tracking-wider">{d.code}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{d.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-extrabold text-blue-700">
                        {d.type === 'percentage' ? `${d.value}% Off` : `${formatCurrency(d.value)} Flat`}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <span>Min Purchase: {formatCurrency(d.minPurchase)}</span>
                      <span className="block text-[11px] text-slate-400">Min Qty: {d.minQuantity || 1}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <span>{formatDate(d.startDate)}</span>
                      <span className="block text-[11px] text-slate-400">To {formatDate(d.endDate)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-32">
                        <div className="flex justify-between text-[11px] font-semibold mb-1">
                          <span>{d.currentUsage} used</span>
                          <span className="text-slate-400">{d.usageLimit} max</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${Math.min(100, (d.currentUsage / d.usageLimit) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <button
                        onClick={() => handleToggleStatus(d)}
                        className="text-xs font-semibold text-slate-600 hover:text-blue-600 px-2 py-1"
                      >
                        {d.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => openEditModal(d)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition"
                        title="Edit Discount"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmDiscount(d)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Delete Discount"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Discount Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDiscount ? 'Edit Discount Promotion' : 'Create Discount Promotion'}
        description="Configure discount calculation formula, validation thresholds, and campaign validity window."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Coupon Code" placeholder="e.g. SUMMER25" required {...register('code', { required: true })} />
            <Input label="Campaign Name" placeholder="e.g. Q4 Expansion Promo" required {...register('name', { required: true })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Discount Type" {...register('type')}>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount ($)</option>
            </Select>
            <Input label="Discount Value" type="number" step="0.01" required {...register('value', { required: true })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Min. Purchase Subtotal ($)" type="number" step="0.01" {...register('minPurchase')} />
            <Input label="Min. Quantity" type="number" {...register('minQuantity')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" required {...register('startDate')} />
            <Input label="End Date" type="date" required {...register('endDate')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Usage Cap (Limit)" type="number" {...register('usageLimit')} />
            <Select label="Status" {...register('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingDiscount ? 'Save Changes' : 'Create Discount'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={!!deleteConfirmDiscount}
        onClose={() => setDeleteConfirmDiscount(null)}
        onConfirm={handleDelete}
        title="Delete Discount Promotion"
        message={`Delete promotion "${deleteConfirmDiscount?.code}"? Quotations already confirmed will retain their applied totals.`}
        confirmText="Delete Promotion"
      />
    </div>
  )
}
