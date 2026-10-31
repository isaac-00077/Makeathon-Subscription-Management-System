import React, { useState, useEffect } from 'react'
import {
  Repeat,
  Play,
  Pause,
  RotateCcw,
  XCircle,
  Eye,
  CheckCircle2,
  Calendar,
  Clock,
  Search,
  DollarSign,
  Layers,
  History,
} from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/common/Button'
import { SearchBar } from '../../components/common/SearchBar'
import { StatusBadge } from '../../components/common/StatusBadge'
import { Modal } from '../../components/common/Modal'
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { EmptyState } from '../../components/common/EmptyState'
import { subscriptionService } from '../../services/subscriptionService'
import { useNotification } from '../../context/NotificationContext'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency, formatDate } from '../../utils/formatters'

export function SubscriptionList() {
  const { role } = useAuth()
  const { showSuccess, showError } = useNotification()
  const [subscriptions, setSubscriptions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals state
  const [viewingSub, setViewingSub] = useState(null)
  const [actionConfirm, setActionConfirm] = useState(null) // { type, sub, title, message }
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadSubscriptions = async () => {
    try {
      setIsLoading(true)
      const data = await subscriptionService.getSubscriptions({ search, status: statusFilter })
      setSubscriptions(data)
    } catch (err) {
      showError('Failed to fetch subscriptions.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSubscriptions()
  }, [search, statusFilter])

  const handleAction = async () => {
    if (!actionConfirm) return
    setIsSubmitting(true)
    const { type, sub } = actionConfirm

    try {
      if (type === 'activate') {
        await subscriptionService.activateSubscription(sub.id)
        showSuccess(`Subscription ${sub.subscriptionNumber} has been activated!`)
      } else if (type === 'pause') {
        await subscriptionService.pauseSubscription(sub.id)
        showSuccess(`Subscription ${sub.subscriptionNumber} is now paused.`)
      } else if (type === 'resume') {
        await subscriptionService.resumeSubscription(sub.id)
        showSuccess(`Subscription ${sub.subscriptionNumber} has resumed active billing.`)
      } else if (type === 'renew') {
        await subscriptionService.renewSubscription(sub.id)
        showSuccess(`Subscription ${sub.subscriptionNumber} renewed for next cycle!`)
      } else if (type === 'close') {
        await subscriptionService.closeSubscription(sub.id)
        showSuccess(`Subscription ${sub.subscriptionNumber} terminated and closed.`)
      }

      setActionConfirm(null)
      if (viewingSub?.id === sub.id) {
        const updated = await subscriptionService.getSubscriptionById(sub.id)
        setViewingSub(updated)
      }
      loadSubscriptions()
    } catch (err) {
      showError(err.message || 'Action failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription Management"
        description="Active customer contracts, scheduled renewal timelines, pause controls, and closure history"
        breadcrumbs={[
          { label: 'Dashboard', href: `/${role}/dashboard` },
          { label: 'Subscriptions' },
        ]}
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by subscription #, customer, or plan..."
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs font-semibold rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 shadow-sm w-full sm:w-auto"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Subscriptions</option>
          <option value="paused">Paused</option>
          <option value="closed">Closed / Cancelled</option>
        </select>
      </div>

      {/* Subscriptions Table */}
      {isLoading ? (
        <LoadingSpinner message="Loading customer subscriptions..." />
      ) : subscriptions.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No subscriptions active"
          description="Convert an approved quotation or generate an operational subscription to begin tracking recurring billing."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Subscription #</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Subscribed Plan</th>
                  <th className="px-6 py-4">Billing Term</th>
                  <th className="px-6 py-4">Cycle Amount</th>
                  <th className="px-6 py-4">Next Billing</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Repeat className="w-4 h-4 text-blue-600" />
                        <span className="font-bold text-slate-900">{sub.subscriptionNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{sub.customerName}</p>
                      <p className="text-[11px] text-slate-500">{sub.customerCompany || sub.customerEmail}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{sub.planName}</td>
                    <td className="px-6 py-4 text-slate-500">{sub.billingFrequency}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {formatCurrency(sub.amount)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(sub.nextBillingDate)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <button
                        onClick={() => setViewingSub(sub)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition"
                        title="View Subscription Details & Audit"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {sub.status === 'active' && (
                        <button
                          onClick={() =>
                            setActionConfirm({
                              type: 'pause',
                              sub,
                              title: 'Pause Subscription',
                              message: `Pause recurring billing for "${sub.subscriptionNumber}"? Services will be held in freeze state until resumed.`,
                            })
                          }
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                          title="Pause Subscription"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      )}

                      {sub.status === 'paused' && (
                        <button
                          onClick={() =>
                            setActionConfirm({
                              type: 'resume',
                              sub,
                              title: 'Resume Subscription',
                              message: `Resume active billing for "${sub.subscriptionNumber}"?`,
                            })
                          }
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition"
                          title="Resume Subscription"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() =>
                          setActionConfirm({
                            type: 'renew',
                            sub,
                            title: 'Renew Subscription Term',
                            message: `Renew "${sub.subscriptionNumber}" for an additional annual billing cycle?`,
                          })
                        }
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        title="Renew Subscription"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>

                      {sub.status !== 'closed' && (
                        <button
                          onClick={() =>
                            setActionConfirm({
                              type: 'close',
                              sub,
                              title: 'Close & Terminate Subscription',
                              message: `Permanently close subscription "${sub.subscriptionNumber}"? Future billing cycles will be halted immediately.`,
                            })
                          }
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Close Subscription"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subscription Detail Modal */}
      {viewingSub && (
        <Modal
          isOpen={!!viewingSub}
          onClose={() => setViewingSub(null)}
          title={`Subscription ${viewingSub.subscriptionNumber}`}
          description={`Contract for ${viewingSub.customerName} (${viewingSub.customerCompany})`}
          maxWidth="max-w-2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <StatusBadge status={viewingSub.status} />
              <Button variant="outline" size="sm" onClick={() => setViewingSub(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Overview meta */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-slate-400 block font-semibold uppercase">Plan & Cycle</span>
                <span className="font-bold text-slate-900 text-sm block mt-0.5">{viewingSub.planName}</span>
                <span className="text-blue-600 font-semibold">{viewingSub.billingFrequency}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold uppercase">Dates</span>
                <span className="text-slate-700 block mt-0.5">Start: {formatDate(viewingSub.startDate)}</span>
                <span className="text-slate-700 block">Next Bill: {formatDate(viewingSub.nextBillingDate)}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold uppercase">Amount</span>
                <span className="text-base font-extrabold text-blue-700 block mt-0.5">
                  {formatCurrency(viewingSub.amount)}
                </span>
                <span className="text-slate-500">{viewingSub.paymentMethod}</span>
              </div>
            </div>

            {/* Product Lines */}
            {viewingSub.productLines && viewingSub.productLines.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100/70 p-2.5 font-bold text-slate-700 border-b border-slate-200">
                  Provisioned Product Deliverables
                </div>
                <div className="divide-y divide-slate-100">
                  {viewingSub.productLines.map((line, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{line.productName}</span>
                        <span className="text-slate-500 block text-[11px]">{line.variant}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-800">{formatCurrency(line.price)}</span>
                        <span className="text-slate-400 block text-[11px]">Qty: {line.qty}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit Trail & History */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <History className="w-4 h-4 text-blue-600" />
                Subscription Lifecycle Audit Trail
              </h4>
              <div className="space-y-2">
                {viewingSub.history?.map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs border-l-2 border-blue-400 pl-3 py-0.5">
                    <span className="text-slate-400 font-mono text-[11px] whitespace-nowrap">{formatDate(entry.date)}</span>
                    <div className="flex-1">
                      <span className="font-semibold text-slate-800">{entry.action}</span>
                      <span className="text-slate-400 ml-1.5">• {entry.actor}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Action Confirmation Dialog */}
      {actionConfirm && (
        <ConfirmationDialog
          isOpen={!!actionConfirm}
          onClose={() => setActionConfirm(null)}
          onConfirm={handleAction}
          title={actionConfirm.title}
          message={actionConfirm.message}
          confirmText="Confirm"
          variant={actionConfirm.type === 'close' ? 'destructive' : 'primary'}
          isLoading={isSubmitting}
        />
      )}
    </div>
  )
}
