import React, { useState, useEffect } from 'react'
import {
  Receipt,
  Download,
  Printer,
  Send,
  CheckCircle2,
  XCircle,
  Eye,
  CreditCard,
  Search,
  AlertCircle,
  Clock,
  Zap,
} from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/common/Button'
import { SearchBar } from '../../components/common/SearchBar'
import { StatusBadge } from '../../components/common/StatusBadge'
import { Modal } from '../../components/common/Modal'
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { EmptyState } from '../../components/common/EmptyState'
import { invoiceService } from '../../services/invoiceService'
import { razorpayService } from '../../services/razorpayService'
import { useNotification } from '../../context/NotificationContext'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency, formatDate } from '../../utils/formatters'

export function InvoiceList() {
  const { role, user } = useAuth()
  const { showSuccess, showError, showInfo } = useNotification()
  const [invoices, setInvoices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals state
  const [viewingInvoice, setViewingInvoice] = useState(null)
  const [cancelConfirmInvoice, setCancelConfirmInvoice] = useState(null)
  const [isPaying, setIsPaying] = useState(false)
  const [activePayingId, setActivePayingId] = useState(null)

  const loadInvoices = async () => {
    try {
      setIsLoading(true)
      const data = await invoiceService.getInvoices({ search, status: statusFilter })
      setInvoices(data)
    } catch (err) {
      showError('Failed to fetch invoices.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadInvoices()
  }, [search, statusFilter])

  const handleSend = async (inv) => {
    try {
      await invoiceService.sendInvoice(inv.id)
      showSuccess(`Invoice ${inv.invoiceNumber} emailed to customer.`)
    } catch (err) {
      showError('Failed to send invoice.')
    }
  }

  const handleConfirm = async (inv) => {
    try {
      await invoiceService.confirmInvoice(inv.id)
      showSuccess(`Invoice ${inv.invoiceNumber} confirmed.`)
      loadInvoices()
    } catch (err) {
      showError('Failed to confirm.')
    }
  }

  const handleCancel = async () => {
    if (!cancelConfirmInvoice) return
    try {
      await invoiceService.cancelInvoice(cancelConfirmInvoice.id)
      showSuccess(`Invoice ${cancelConfirmInvoice.invoiceNumber} cancelled.`)
      setCancelConfirmInvoice(null)
      loadInvoices()
    } catch (err) {
      showError('Failed to cancel.')
    }
  }

  const handlePrint = (inv) => {
    setViewingInvoice(inv)
    setTimeout(() => {
      window.print()
    }, 400)
  }

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
          showInfo('Checkout dismissed.')
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
        title="Invoice Management"
        description="Accounting ledger, tax & discount breakdowns, receivable aging, and checkout settlement"
        breadcrumbs={[
          { label: 'Dashboard', href: `/${role}/dashboard` },
          { label: 'Invoices' },
        ]}
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by invoice # or client..."
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs font-semibold rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 shadow-sm w-full sm:w-auto"
        >
          <option value="all">All Invoices</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending Settlement</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="overdue">Overdue Notices</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Invoices Table */}
      {isLoading ? (
        <LoadingSpinner message="Fetching billing statements..." />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No invoices found"
          description="Invoices are generated upon quotation conversion or recurring subscription cycles."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Issue / Due Date</th>
                  <th className="px-6 py-4">Grand Total</th>
                  <th className="px-6 py-4">Balance Due</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
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
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{inv.customerName}</p>
                      <p className="text-[11px] text-slate-500">{inv.customerCompany || inv.customerEmail}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <span>{formatDate(inv.issueDate)}</span>
                      <span className="block text-[11px] text-slate-400">Due: {formatDate(inv.dueDate)}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {formatCurrency(inv.grandTotal)}
                    </td>
                    <td className="px-6 py-4">
                      {inv.balance > 0 ? (
                        <span className="font-bold text-rose-600">{formatCurrency(inv.balance)}</span>
                      ) : (
                        <span className="font-semibold text-emerald-600">Settled ($0.00)</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <button
                        onClick={() => setViewingInvoice(inv)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition"
                        title="View & Print Statement"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handlePrint(inv)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                        title="Print / Save PDF"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {role !== 'customer' && (
                        <button
                          onClick={() => handleSend(inv)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                          title="Dispatch via Email"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}

                      {inv.balance > 0 && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Zap}
                          isLoading={isPaying && activePayingId === inv.id}
                          onClick={() => handlePayNow(inv)}
                          className="text-xs"
                        >
                          Pay
                        </Button>
                      )}

                      {role === 'admin' && inv.status !== 'cancelled' && inv.balance > 0 && (
                        <button
                          onClick={() => setCancelConfirmInvoice(inv)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Cancel Invoice"
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

      {/* Invoice Details & Printable View Modal */}
      {viewingInvoice && (
        <Modal
          isOpen={!!viewingInvoice}
          onClose={() => setViewingInvoice(null)}
          title={`Invoice ${viewingInvoice.invoiceNumber}`}
          description={`Billed to ${viewingInvoice.customerName} on ${formatDate(viewingInvoice.issueDate)}`}
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
                  Print / Save PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => setViewingInvoice(null)}>
                  Close
                </Button>
              </div>
            </div>
          }
        >
          {/* Official Invoice Statement Layout */}
          <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-6 text-xs text-slate-800">
            {/* Header info */}
            <div className="flex items-start justify-between pb-6 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black">
                    S
                  </div>
                  <span className="font-bold text-slate-900 text-base">SubFlow Inc.</span>
                </div>
                <p className="text-slate-500">100 Tech Enterprise Blvd, Suite 800</p>
                <p className="text-slate-500">San Francisco, CA 94107</p>
                <p className="text-slate-500">billing@subflow.io</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-slate-900 tracking-tight block">INVOICE</span>
                <span className="font-mono text-sm font-bold text-blue-600 block mt-1">{viewingInvoice.invoiceNumber}</span>
                <span className="text-slate-500 block mt-1">Issue Date: {formatDate(viewingInvoice.issueDate)}</span>
                <span className="text-rose-600 font-semibold block">Due Date: {formatDate(viewingInvoice.dueDate)}</span>
              </div>
            </div>

            {/* Bill to */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Billed To</span>
                <p className="font-bold text-slate-900 text-sm">{viewingInvoice.customerName}</p>
                <p className="text-slate-600 font-medium">{viewingInvoice.customerCompany}</p>
                <p className="text-slate-500">{viewingInvoice.customerAddress || 'Direct Customer Account'}</p>
                <p className="text-slate-500">{viewingInvoice.customerEmail}</p>
              </div>
              <div className="text-right">
                <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Payment Status</span>
                <div className="inline-block">
                  <StatusBadge status={viewingInvoice.status} />
                </div>
                {viewingInvoice.subscriptionId && (
                  <p className="text-slate-500 mt-2 font-mono text-[11px]">Sub Ref: {viewingInvoice.subscriptionId}</p>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-100/70 border-b border-slate-200 font-semibold text-slate-700">
                  <tr>
                    <th className="p-3">Description</th>
                    <th className="p-3">Quantity</th>
                    <th className="p-3">Rate</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewingInvoice.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-medium text-slate-900">{item.description}</td>
                      <td className="p-3">{item.quantity}</td>
                      <td className="p-3">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculation summary */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal:</span>
                  <span className="text-slate-800">{formatCurrency(viewingInvoice.subtotal)}</span>
                </div>
                {viewingInvoice.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount ({viewingInvoice.discountName || 'Promo'}):</span>
                    <span>-{formatCurrency(viewingInvoice.discountAmount)}</span>
                  </div>
                )}
                {viewingInvoice.taxTotal > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Tax Breakdown:</span>
                    <span>+{formatCurrency(viewingInvoice.taxTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-200 font-extrabold text-slate-900 text-sm">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(viewingInvoice.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Paid:</span>
                  <span>{formatCurrency(viewingInvoice.amountPaid || 0)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 font-extrabold text-rose-600 text-sm">
                  <span>Balance Due:</span>
                  <span>{formatCurrency(viewingInvoice.balance)}</span>
                </div>
              </div>
            </div>

            {viewingInvoice.notes && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-[11px]">
                <span className="font-semibold block text-slate-700">Terms & Instructions:</span>
                {viewingInvoice.notes}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Cancel Confirmation */}
      <ConfirmationDialog
        isOpen={!!cancelConfirmInvoice}
        onClose={() => setCancelConfirmInvoice(null)}
        onConfirm={handleCancel}
        title="Cancel Invoice Statement"
        message={`Are you sure you want to cancel invoice "${cancelConfirmInvoice?.invoiceNumber}"? This will write off the remaining balance of ${formatCurrency(cancelConfirmInvoice?.balance)}.`}
        confirmText="Cancel Invoice"
      />
    </div>
  )
}
