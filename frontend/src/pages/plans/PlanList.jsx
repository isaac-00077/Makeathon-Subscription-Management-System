import React, { useState, useEffect } from 'react'
import { Plus, Layers, Edit, Trash2, CheckCircle2, Clock, Calendar, RefreshCw, XCircle } from 'lucide-react'
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
import { planService } from '../../services/planService'
import { useNotification } from '../../context/NotificationContext'
import { formatCurrency, formatDate } from '../../utils/formatters'

export function PlanList() {
  const { showSuccess, showError } = useNotification()
  const [plans, setPlans] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [freqFilter, setFreqFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [deleteConfirmPlan, setDeleteConfirmPlan] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, reset } = useForm()

  const loadPlans = async () => {
    try {
      setIsLoading(true)
      const data = await planService.getPlans({ search, frequency: freqFilter })
      setPlans(data)
    } catch (err) {
      showError(err.message || 'Failed to load plans.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPlans()
  }, [search, freqFilter])

  const openCreateModal = () => {
    setEditingPlan(null)
    reset({
      name: '',
      code: '',
      billingFrequency: 'Monthly',
      basePrice: 99.0,
      setupFee: 0,
      minimumQuantity: 1,
      availabilityDate: new Date().toISOString().split('T')[0],
      description: '',
      pauseAllowed: true,
      maxPauseDays: 30,
      autoRenew: true,
      noticeDays: 7,
      refundPolicy: 'Prorated service credit',
      status: 'active',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (plan) => {
    setEditingPlan(plan)
    reset({
      name: plan.name,
      code: plan.code,
      billingFrequency: plan.billingFrequency,
      basePrice: plan.basePrice,
      setupFee: plan.setupFee || 0,
      minimumQuantity: plan.minimumQuantity || 1,
      availabilityDate: plan.availabilityDate || new Date().toISOString().split('T')[0],
      description: plan.description || '',
      pauseAllowed: plan.pauseSettings?.allowed ?? true,
      maxPauseDays: plan.pauseSettings?.maxPauseDurationDays ?? 30,
      autoRenew: plan.renewalSettings?.autoRenew ?? true,
      noticeDays: plan.closureSettings?.cancellationNoticeDays ?? 7,
      refundPolicy: plan.closureSettings?.refundPolicy || '',
      status: plan.status || 'active',
    })
    setIsModalOpen(true)
  }

  const onSubmit = async (formData) => {
    setIsSubmitting(true)
    try {
      const payload = {
        name: formData.name,
        code: formData.code,
        billingFrequency: formData.billingFrequency,
        basePrice: parseFloat(formData.basePrice),
        setupFee: parseFloat(formData.setupFee),
        minimumQuantity: parseInt(formData.minimumQuantity),
        availabilityDate: formData.availabilityDate,
        description: formData.description,
        pauseSettings: {
          allowed: Boolean(formData.pauseAllowed),
          maxPauseDurationDays: parseInt(formData.maxPauseDays) || 30,
          pauseFee: 0,
        },
        renewalSettings: {
          autoRenew: Boolean(formData.autoRenew),
          reminderDaysBefore: 7,
        },
        closureSettings: {
          cancellationNoticeDays: parseInt(formData.noticeDays) || 7,
          refundPolicy: formData.refundPolicy,
        },
        status: formData.status,
      }

      if (editingPlan) {
        await planService.updatePlan(editingPlan.id, payload)
        showSuccess('Subscription plan updated successfully!')
      } else {
        await planService.createPlan(payload)
        showSuccess('New subscription plan activated!')
      }
      setIsModalOpen(false)
      loadPlans()
    } catch (err) {
      showError(err.message || 'Error saving plan.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirmPlan) return
    try {
      await planService.deletePlan(deleteConfirmPlan.id)
      showSuccess('Plan removed successfully.')
      setDeleteConfirmPlan(null)
      loadPlans()
    } catch (err) {
      showError(err.message || 'Failed to delete plan.')
    }
  }

  const handleToggleStatus = async (plan) => {
    try {
      await planService.togglePlanStatus(plan.id)
      showSuccess(`Plan status toggled to ${plan.status === 'active' ? 'inactive' : 'active'}`)
      loadPlans()
    } catch (err) {
      showError('Failed to change status.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription Plans"
        description="Billing cycle frequencies, pause permissions, renewal schedules, and closure terms"
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Plans' },
        ]}
        actions={
          <Button variant="primary" size="sm" icon={Plus} onClick={openCreateModal}>
            Create Plan
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search plans by name or code..."
        />
        <select
          value={freqFilter}
          onChange={(e) => setFreqFilter(e.target.value)}
          className="text-xs font-semibold rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 shadow-sm w-full sm:w-auto"
        >
          <option value="all">All Frequencies</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      {/* Plan Cards Grid */}
      {isLoading ? (
        <LoadingSpinner message="Loading subscription plans..." />
      ) : plans.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No subscription plans found"
          description="Create your first subscription plan to package recurring billing terms."
          actionLabel="Create Plan"
          onAction={openCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between hover:border-slate-300 transition"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      {plan.billingFrequency}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{plan.name}</h3>
                    <p className="text-xs font-mono text-slate-400">{plan.code}</p>
                  </div>
                  <StatusBadge status={plan.status} />
                </div>

                <div className="my-4 pb-4 border-b border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {formatCurrency(plan.basePrice)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">/{plan.billingFrequency.toLowerCase()}</span>
                  </div>
                  {plan.setupFee > 0 && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      + {formatCurrency(plan.setupFee)} initial setup fee
                    </p>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4 line-clamp-2">
                  {plan.description || 'Standard recurring contract allotment.'}
                </p>

                {/* Terms Overview */}
                <div className="space-y-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span>Pause Option:</span>
                    <span className="font-semibold text-slate-800">
                      {plan.pauseSettings?.allowed ? `Yes (Up to ${plan.pauseSettings.maxPauseDurationDays}d)` : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Auto-Renewal:</span>
                    <span className="font-semibold text-slate-800">
                      {plan.renewalSettings?.autoRenew ? 'Enabled Default' : 'Manual'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Notice Period:</span>
                    <span className="font-semibold text-slate-800">
                      {plan.closureSettings?.cancellationNoticeDays} days
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleToggleStatus(plan)}
                  className="text-xs font-semibold text-slate-600 hover:text-blue-600"
                >
                  {plan.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(plan)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition"
                    title="Edit Plan"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmPlan(plan)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Delete Plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plan Create & Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
        description="Configure frequency intervals, price points, and policy constraints."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Plan Name" placeholder="e.g. Starter Pro - Monthly" required {...register('name', { required: true })} />
            <Input label="Plan Code" placeholder="e.g. PLAN-STR-M" required {...register('code', { required: true })} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Select label="Billing Frequency" {...register('billingFrequency')}>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Half-Yearly">Half-Yearly</option>
              <option value="Yearly">Yearly</option>
            </Select>
            <Input label="Base Price ($)" type="number" step="0.01" required {...register('basePrice', { required: true })} />
            <Input label="Setup Fee ($)" type="number" step="0.01" {...register('setupFee')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Minimum Quantity" type="number" {...register('minimumQuantity')} />
            <Input label="Availability Date" type="date" {...register('availabilityDate')} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
            <textarea
              rows={2}
              className="block w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Summary of plan inclusions..."
              {...register('description')}
            />
          </div>

          {/* Pause & Policy Settings */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-900">Lifecycle & Closure Policies</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded text-blue-600" {...register('pauseAllowed')} />
                <span>Allow Customer Pause</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded text-blue-600" {...register('autoRenew')} />
                <span>Auto-Renew by Default</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Max Pause Days" type="number" {...register('maxPauseDays')} />
              <Input label="Cancellation Notice (Days)" type="number" {...register('noticeDays')} />
            </div>
            <Input label="Refund / Credit Policy" placeholder="e.g. Prorated balance credit" {...register('refundPolicy')} />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingPlan ? 'Save Changes' : 'Create Plan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={!!deleteConfirmPlan}
        onClose={() => setDeleteConfirmPlan(null)}
        onConfirm={handleDelete}
        title="Delete Subscription Plan"
        message={`Are you sure you want to delete "${deleteConfirmPlan?.name}"? Existing active subscriptions will retain their active rates.`}
        confirmText="Delete Plan"
      />
    </div>
  )
}
