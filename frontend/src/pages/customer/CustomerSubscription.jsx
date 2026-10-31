import React, { useState, useEffect } from 'react'
import {
  Repeat,
  Pause,
  Play,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Layers,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/common/Button'
import { StatusBadge } from '../../components/common/StatusBadge'
import { Modal } from '../../components/common/Modal'
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { useAuth } from '../../context/AuthContext'
import { dashboardService } from '../../services/dashboardService'
import { subscriptionService } from '../../services/subscriptionService'
import { useNotification } from '../../context/NotificationContext'
import { formatCurrency, formatDate } from '../../utils/formatters'

export function CustomerSubscription() {
  const { user } = useAuth()
  const { showSuccess, showError } = useNotification()
  const [sub, setSub] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionModal, setActionModal] = useState(null) // { type, title, message }
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadSub = async () => {
    try {
      setIsLoading(true)
      const data = await dashboardService.getCustomerStats(user?.email || 'customer@acme.inc')
      setSub(data.currentSubscription)
    } catch (err) {
      showError('Failed to load subscription details.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSub()
  }, [user])

  const handleAction = async () => {
    if (!actionModal || !sub) return
    setIsSubmitting(true)
    const { type } = actionModal

    try {
      if (type === 'pause') {
        await subscriptionService.pauseSubscription(sub.id, 'Paused by customer portal request')
        showSuccess('Your subscription has been placed on temporary hold.')
      } else if (type === 'resume') {
        await subscriptionService.resumeSubscription(sub.id)
        showSuccess('Your subscription billing and access have resumed!')
      } else if (type === 'renew') {
        await subscriptionService.renewSubscription(sub.id)
        showSuccess('Your subscription contract has been extended!')
      }

      setActionModal(null)
      loadSub()
    } catch (err) {
      showError(err.message || 'Failed to process request.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <LoadingSpinner message="Retrieving your subscription entitlement records..." />
  }

  if (!sub) {
    return (
      <div>
        <PageHeader title="My Subscription" description="Your active service licenses and plan allocations" />
        <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
          <Repeat className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Active Subscription</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            You do not currently have an active recurring plan. Please contact sales or staff to activate your account.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Subscription"
        description="Comprehensive details of your ongoing subscription license and scheduled billing cycles"
        breadcrumbs={[
          { label: 'Portal', href: '/customer/dashboard' },
          { label: 'My Subscription' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {sub.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                icon={Pause}
                onClick={() =>
                  setActionModal({
                    type: 'pause',
                    title: 'Pause Subscription',
                    message: 'Would you like to temporarily pause your subscription services? You may resume at any time.',
                  })
                }
              >
                Pause Services
              </Button>
            )}

            {sub.status === 'paused' && (
              <Button
                variant="primary"
                size="sm"
                icon={Play}
                onClick={() =>
                  setActionModal({
                    type: 'resume',
                    title: 'Resume Subscription',
                    message: 'Resume full service access and restart billing schedule immediately?',
                  })
                }
              >
                Resume Active Billing
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={() =>
                setActionModal({
                  type: 'renew',
                  title: 'Renew Subscription Term',
                  message: 'Extend your current plan for another full annual contract cycle?',
                })
              }
            >
              Request Renewal
            </Button>
          </div>
        }
      />

      {/* Main Subscription Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              {sub.billingFrequency} Contract
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-2">{sub.planName}</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Reference ID: {sub.subscriptionNumber}</p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-400 block uppercase font-bold">Billing Cycle Rate</span>
            <span className="text-3xl font-black text-slate-900 mt-0.5 block">
              {formatCurrency(sub.amount)}
            </span>
            <StatusBadge status={sub.status} className="mt-2" />
          </div>
        </div>

        {/* Timeline Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-xs text-slate-500 block">Contract Inception</span>
            <span className="text-sm font-bold text-slate-900 mt-1 block">{formatDate(sub.startDate)}</span>
            <span className="text-[11px] text-slate-400">First billing activation</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-xs text-slate-500 block">Next Scheduled Invoicing</span>
            <span className="text-sm font-bold text-slate-900 mt-1 block">{formatDate(sub.nextBillingDate)}</span>
            <span className="text-[11px] text-blue-600 font-medium">Automatic cycle renewal</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-xs text-slate-500 block">Term Expiration Date</span>
            <span className="text-sm font-bold text-slate-900 mt-1 block">{formatDate(sub.expiryDate)}</span>
            <span className="text-[11px] text-slate-400">Subject to master terms</span>
          </div>
        </div>

        {/* Product Deliverables */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Active Service Deliverables & Add-ons
          </h3>
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="divide-y divide-slate-100">
              {sub.productLines?.map((line, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">{line.productName}</span>
                    <span className="text-xs text-slate-500">{line.variant}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-800 text-sm block">{formatCurrency(line.price)}</span>
                    <span className="text-xs text-slate-400">Quantity: {line.qty}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {actionModal && (
        <ConfirmationDialog
          isOpen={!!actionModal}
          onClose={() => setActionModal(null)}
          onConfirm={handleAction}
          title={actionModal.title}
          message={actionModal.message}
          confirmText="Confirm Request"
          isLoading={isSubmitting}
        />
      )}
    </div>
  )
}
