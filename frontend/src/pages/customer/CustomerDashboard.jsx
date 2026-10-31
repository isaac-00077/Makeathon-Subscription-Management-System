import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  CreditCard,
  Receipt,
  Repeat,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/common/Button'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { useAuth } from '../../context/AuthContext'
import { dashboardService } from '../../services/dashboardService'
import { razorpayService } from '../../services/razorpayService'
import { useNotification } from '../../context/NotificationContext'
import { formatCurrency, formatDate } from '../../utils/formatters'

export function CustomerDashboard() {
  const { user } = useAuth()
  const { showSuccess, showError, showInfo } = useNotification()
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPaying, setIsPaying] = useState(false)
  const [activePaymentInvoice, setActivePaymentInvoice] = useState(null)

  const loadData = async () => {
    try {
      const email = user?.email || 'customer@acme.inc'
      const result = await dashboardService.getCustomerStats(email)
      setData(result)
    } catch (err) {
      console.error('Failed to load customer stats', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  const handlePayNow = async (invoice) => {
    if (!invoice || invoice.balance <= 0) return
    setIsPaying(true)
    setActivePaymentInvoice(invoice.id)

    try {
      await razorpayService.initiateCheckout({
        invoice,
        customer: user,
        onProgress: (statusMsg) => {
          showInfo(statusMsg)
        },
        onSuccess: (verifyResult) => {
          showSuccess(verifyResult.message || 'Payment confirmed by backend verification!')
          loadData() // Refresh records
        },
        onError: (err) => {
          showError(err.message || 'Payment processing failed or was cancelled.')
        },
        onCancel: () => {
          showInfo('Payment checkout was dismissed.')
        },
      })
    } catch (err) {
      showError(err.message || 'Could not launch checkout.')
    } finally {
      setIsPaying(false)
      setActivePaymentInvoice(null)
    }
  }

  if (isLoading || !data) {
    return <LoadingSpinner message="Loading your customer membership portal..." />
  }

  const sub = data.currentSubscription
  const primaryUnpaidInvoice = data.unpaidInvoices?.[0] || null

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Verified Enterprise Member
            </span>
            <span className="text-xs text-slate-300">• {user?.company || 'Acme Technologies Inc.'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {user?.name || 'Customer'}
          </h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Manage active service subscriptions, view invoices, download payment receipts, and settle dues securely with Razorpay checkout.
          </p>
        </div>
      </div>

      {/* Subscription & Balance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Subscription Overview */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Repeat className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Current Subscription</h3>
              </div>
              {sub ? <StatusBadge status={sub.status} /> : <StatusBadge status="inactive" />}
            </div>

            {sub ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs text-slate-500 block">Subscribed Plan</span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block">{sub.planName}</span>
                  <span className="text-[11px] text-blue-600 font-semibold">{sub.billingFrequency} Billing</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs text-slate-500 block">Next Billing Due</span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block">{formatDate(sub.nextBillingDate)}</span>
                  <span className="text-[11px] text-slate-500">Auto-renews at term</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs text-slate-500 block">Cycle Amount</span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block">{formatCurrency(sub.amount)}</span>
                  <span className="text-[11px] text-slate-500">Includes active variants</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-4">No active subscription found for this account.</p>
            )}

            {sub?.productLines && sub.productLines.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-slate-700 mb-2">Active Service Entitlements:</p>
                <div className="space-y-1.5">
                  {sub.productLines.map((line, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-medium text-slate-800">{line.productName} ({line.variant})</span>
                      <span className="text-slate-500">Qty: {line.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Subscription Ref: <code className="font-mono">{sub?.subscriptionNumber || 'N/A'}</code></span>
            <Link to="/customer/subscription">
              <Button variant="outline" size="sm" icon={ExternalLink}>
                Manage Plan
              </Button>
            </Link>
          </div>
        </div>

        {/* Outstanding Balance & Pay Now Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Billing Summary</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">Total outstanding balance across all invoices</p>

            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-center mb-4">
              <span className="text-xs text-slate-600 font-medium">Outstanding Balance</span>
              <h2 className="text-3xl font-extrabold text-slate-900 mt-1">
                {formatCurrency(data.outstandingBalance)}
              </h2>
              {data.outstandingBalance > 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 mt-1">
                  <Clock className="w-3.5 h-3.5" /> Due for settlement
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> All invoices paid
                </span>
              )}
            </div>
          </div>

          <div>
            {primaryUnpaidInvoice ? (
              <Button
                variant="primary"
                size="lg"
                className="w-full gap-2 shadow-md bg-blue-600 hover:bg-blue-700"
                isLoading={isPaying && activePaymentInvoice === primaryUnpaidInvoice.id}
                onClick={() => handlePayNow(primaryUnpaidInvoice)}
              >
                <Zap className="w-4 h-4 fill-white" />
                Pay Now with Razorpay ({formatCurrency(primaryUnpaidInvoice.balance)})
              </Button>
            ) : (
              <Button variant="outline" size="lg" className="w-full" disabled>
                No Pending Dues
              </Button>
            )}
            <p className="text-[10px] text-slate-400 text-center mt-2">
              Protected by Razorpay 256-bit secure gateway
            </p>
          </div>
        </div>
      </div>

      {/* Invoices and Payments Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Invoices & Statements</h3>
              <p className="text-xs text-slate-500">History of generated billing cycles</p>
            </div>
            <Link to="/customer/invoices" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              All Invoices <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Invoice</th>
                  <th className="pb-3">Due Date</th>
                  <th className="pb-3">Total</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50">
                    <td className="py-3 font-bold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="py-3 text-slate-500">{formatDate(inv.dueDate)}</td>
                    <td className="py-3 font-bold text-slate-900">{formatCurrency(inv.grandTotal)}</td>
                    <td className="py-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-3 text-right">
                      {inv.balance > 0 ? (
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={isPaying && activePaymentInvoice === inv.id}
                          onClick={() => handlePayNow(inv)}
                        >
                          Pay
                        </Button>
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-semibold">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Receipts & Payment History</h3>
              <p className="text-xs text-slate-500">Verified transactions and receipts</p>
            </div>
            <Link to="/customer/payments" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              All Payments <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Receipt</th>
                  <th className="pb-3">Invoice</th>
                  <th className="pb-3">Method</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-3 font-bold text-slate-900">{p.paymentNumber}</td>
                    <td className="py-3 text-slate-600">{p.invoiceNumber}</td>
                    <td className="py-3 text-slate-600 font-medium">{p.method}</td>
                    <td className="py-3 font-bold text-slate-900">{formatCurrency(p.amount)}</td>
                    <td className="py-3">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
