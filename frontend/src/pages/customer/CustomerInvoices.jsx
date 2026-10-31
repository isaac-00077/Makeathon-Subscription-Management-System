import React, { useState, useEffect } from 'react'
import {
  Receipt,
  Download,
  Printer,
  Eye,
  CheckCircle2,
  Clock,
  Zap,
} from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/common/Button'
import { StatusBadge } from '../../components/common/StatusBadge'
import { Modal } from '../../components/common/Modal'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { EmptyState } from '../../components/common/EmptyState'
import { useAuth } from '../../context/AuthContext'
import { dashboardService } from '../../services/dashboardService'
import { razorpayService } from '../../services/razorpayService'
import { useNotification } from '../../context/NotificationContext'
import { formatCurrency, formatDate } from '../../utils/formatters'

export function CustomerInvoices() {
  const { user } = useAuth()
  const { showSuccess, showError, showInfo } = useNotification()
  const [invoices, setInvoices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewingInvoice, setViewingInvoice] = useState(null)
  const [isPaying, setIsPaying] = useState(false)
  const [activePayingId, setActivePayingId] = useState(null)

  const loadInvoices = async () => {
    try {
      setIsLoading(true)
      const data = await dashboardService.getCustomerStats(user?.email || 'customer@acme.inc')
      setInvoices(data.invoices || [])
    } catch (err) {
      showError('Failed to load billing history.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadInvoices()
  }, [user])

  const handlePayNow = async (invoice) => {
    if (!invoice || invoice.balance <= 0) return
    setIsPaying(true)
    setActivePayingId(invoice.id)

    try {
      await razorpayService.initiateCheckout({
        invoice,
        customer: user,
        onProgress: (statusMsg) => showInfo(statusMsg),
        onSuccess: (verifyResult) => {
          showSuccess(verifyResult.message || 'Payment confirmed by backend verification!')
          loadInvoices()
          if (viewingInvoice?.id === invoice.id) setViewingInvoice(null)
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
      setActivePayingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices & Statements"
        description="All current and historical invoices issued for your subscription account"
        breadcrumbs={[
          { label: 'Portal', href: '/customer/dashboard' },
          { label: 'Invoices' },
        ]}
      />

      {isLoading ? (
        <LoadingSpinner message="Retrieving your billing records..." />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No statements generated"
          description="Your invoices will appear here upon completion of billing cycles."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Issue Date</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4">Invoice Amount</th>
                  <th className="px-6 py-4">Balance Remaining</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-blue-600" />
                        <span className="font-bold text-slate-900">{inv.invoiceNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(inv.issueDate)}</td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(inv.dueDate)}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {formatCurrency(inv.grandTotal)}
                    </td>
                    <td className="px-6 py-4">
                      {inv.balance > 0 ? (
                        <span className="font-bold text-rose-600">{formatCurrency(inv.balance)}</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">Settled</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setViewingInvoice(inv)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition"
                        title="View Statement"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {inv.balance > 0 && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Zap}
                          isLoading={isPaying && activePayingId === inv.id}
                          onClick={() => handlePayNow(inv)}
                          className="text-xs"
                        >
                          Pay Now
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

      {/* Invoice Statement Modal */}
      {viewingInvoice && (
        <Modal
          isOpen={!!viewingInvoice}
          onClose={() => setViewingInvoice(null)}
          title={`Invoice ${viewingInvoice.invoiceNumber}`}
          description={`Issued on ${formatDate(viewingInvoice.issueDate)}`}
          maxWidth="max-w-2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <StatusBadge status={viewingInvoice.status} />
              <div className="flex gap-2">
                {viewingInvoice.balance > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Zap}
                    isLoading={isPaying && activePayingId === viewingInvoice.id}
                    onClick={() => handlePayNow(viewingInvoice)}
                  >
                    Pay Balance ({formatCurrency(viewingInvoice.balance)})
                  </Button>
                )}
                <Button variant="outline" size="sm" icon={Printer} onClick={() => window.print()}>
                  Print Statement
                </Button>
                <Button variant="outline" size="sm" onClick={() => setViewingInvoice(null)}>
                  Close
                </Button>
              </div>
            </div>
          }
        >
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 text-xs">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-slate-900 text-sm">{viewingInvoice.customerName}</p>
                <p className="text-slate-500">{viewingInvoice.customerCompany}</p>
                <p className="text-slate-500">{viewingInvoice.customerEmail}</p>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-900 text-sm block">Invoice #{viewingInvoice.invoiceNumber}</span>
                <span className="text-slate-500 block">Due: {formatDate(viewingInvoice.dueDate)}</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-100 p-2 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5">Qty</th>
                    <th className="p-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewingInvoice.items?.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-medium text-slate-800">{it.description}</td>
                      <td className="p-2.5">{it.quantity}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">{formatCurrency(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-extrabold">
              <span>Total Balance Due:</span>
              <span className="text-rose-600">{formatCurrency(viewingInvoice.balance)}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
