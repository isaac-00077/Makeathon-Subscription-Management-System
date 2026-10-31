import React, { useState, useEffect } from 'react'
import {
  CreditCard,
  Plus,
  DollarSign,
  Receipt,
  Search,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  FileText,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Select } from '../../components/common/Select'
import { SearchBar } from '../../components/common/SearchBar'
import { StatusBadge } from '../../components/common/StatusBadge'
import { Modal } from '../../components/common/Modal'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { EmptyState } from '../../components/common/EmptyState'
import { paymentService } from '../../services/paymentService'
import { invoiceService } from '../../services/invoiceService'
import { userService } from '../../services/userService'
import { useNotification } from '../../context/NotificationContext'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency, formatDateTime } from '../../utils/formatters'

export function PaymentList() {
  const { role } = useAuth()
  const { showSuccess, showError } = useNotification()
  const [payments, setPayments] = useState([])
  const [invoices, setInvoices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')

  // Manual payment modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      invoiceId: '',
      method: 'Bank Transfer',
      amount: 0,
      transactionReference: '',
      notes: '',
    },
  })

  const selectedInvoiceId = watch('invoiceId')
  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId)

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [payList, invList] = await Promise.all([
        paymentService.getPayments({ search, method: methodFilter }),
        invoiceService.getInvoices(),
      ])
      setPayments(payList)
      setInvoices(invList)
    } catch (err) {
      showError('Failed to load payments.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [search, methodFilter])

  const openRecordModal = () => {
    const unpaid = invoices.find((i) => i.balance > 0) || invoices[0]
    reset({
      invoiceId: unpaid?.id || '',
      method: 'Bank Transfer',
      amount: unpaid?.balance || 0,
      transactionReference: `MANUAL-REF-${Date.now().toString().slice(-6)}`,
      notes: 'Manual payment recorded by staff.',
    })
    setIsModalOpen(true)
  }

  const handleInvoiceChange = (invId) => {
    setValue('invoiceId', invId)
    const target = invoices.find((i) => i.id === invId)
    if (target) {
      setValue('amount', target.balance > 0 ? target.balance : target.grandTotal)
    }
  }

  const onSubmit = async (formData) => {
    setIsSubmitting(true)
    try {
      await paymentService.recordPayment(formData)
      showSuccess('Manual payment recorded and ledger updated!')
      setIsModalOpen(false)
      loadData()
    } catch (err) {
      showError(err.message || 'Error recording payment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Management"
        description="Transaction logs, manual payment reconciliations, Razorpay gateway settlements, and receipts"
        breadcrumbs={[
          { label: 'Dashboard', href: `/${role}/dashboard` },
          { label: 'Payments' },
        ]}
        actions={
          role !== 'customer' && (
            <Button variant="primary" size="sm" icon={Plus} onClick={openRecordModal}>
              Record Manual Payment
            </Button>
          )
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by receipt #, customer, or txn ref..."
        />
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="text-xs font-semibold rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 shadow-sm w-full sm:w-auto"
        >
          <option value="all">All Payment Methods</option>
          <option value="razorpay">Razorpay Standard Checkout</option>
          <option value="bank transfer">Bank Transfer</option>
          <option value="card">Credit / Debit Card</option>
          <option value="upi">UPI Transfer</option>
          <option value="cash">Cash / Cheque</option>
        </select>
      </div>

      {/* Payments Table */}
      {isLoading ? (
        <LoadingSpinner message="Loading financial transactions..." />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payment records found"
          description="Settle an invoice via Razorpay or record a manual receipt to populate transactions."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Receipt #</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Related Invoice</th>
                  <th className="px-6 py-4">Payment Method</th>
                  <th className="px-6 py-4">Amount Paid</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="font-bold text-slate-900">{p.paymentNumber}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{p.transactionReference}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{p.customerName}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {p.invoiceNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                        {p.method === 'Razorpay' ? (
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                        )}
                        {p.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-600 text-sm">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{formatDateTime(p.paymentDate)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Manual Payment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Manual Payment Entry"
        description="Apply full or partial payment against outstanding invoice receivables."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Invoice to Settle</label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => handleInvoiceChange(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-500"
            >
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — {inv.customerName} (Bal: {formatCurrency(inv.balance)})
                </option>
              ))}
            </select>
          </div>

          {selectedInvoice && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Grand Total:</span>
                <span className="font-bold">{formatCurrency(selectedInvoice.grandTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Already Paid:</span>
                <span className="text-emerald-600 font-semibold">{formatCurrency(selectedInvoice.amountPaid || 0)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-rose-600">
                <span>Remaining Balance Due:</span>
                <span>{formatCurrency(selectedInvoice.balance)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Select label="Payment Method" {...register('method')}>
              <option value="Bank Transfer">Bank Transfer (ACH / Wire)</option>
              <option value="UPI">UPI</option>
              <option value="Card">Credit / Debit Card</option>
              <option value="Cash">Cash / Cheque</option>
              <option value="Razorpay">Razorpay Manual</option>
            </Select>

            <Input
              label="Amount to Record ($)"
              type="number"
              step="0.01"
              required
              {...register('amount', { required: true })}
            />
          </div>

          <Input
            label="Transaction / Reference ID"
            placeholder="e.g. WIRE-881920 or UPI Ref"
            required
            {...register('transactionReference', { required: true })}
          />

          <Input
            label="Internal Notes"
            placeholder="e.g. Deposit verified in Wells Fargo operating account"
            {...register('notes')}
          />

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Record & Reconcile
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
