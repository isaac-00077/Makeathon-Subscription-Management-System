import React, { useState, useEffect } from 'react'
import { CreditCard, CheckCircle2, Receipt, Search, Download } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { EmptyState } from '../../components/common/EmptyState'
import { useAuth } from '../../context/AuthContext'
import { dashboardService } from '../../services/dashboardService'
import { formatCurrency, formatDateTime } from '../../utils/formatters'

export function CustomerPayments() {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await dashboardService.getCustomerStats(user?.email || 'customer@acme.inc')
        setPayments(data.payments || [])
      } catch (err) {
        console.error('Failed to load payments', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [user])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment History & Receipts"
        description="Official payment confirmations, transaction identifiers, and method reconciliations"
        breadcrumbs={[
          { label: 'Portal', href: '/customer/dashboard' },
          { label: 'Payments' },
        ]}
      />

      {isLoading ? (
        <LoadingSpinner message="Retrieving transaction receipts..." />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payment receipts"
          description="Your confirmed payment transactions and receipts will appear here."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Receipt #</th>
                  <th className="px-6 py-4">Related Invoice</th>
                  <th className="px-6 py-4">Payment Method</th>
                  <th className="px-6 py-4">Transaction Reference</th>
                  <th className="px-6 py-4">Amount Paid</th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{p.paymentNumber}</td>
                    <td className="px-6 py-4 font-mono font-medium text-slate-700">{p.invoiceNumber}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                        {p.method === 'Razorpay' ? (
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                        )}
                        {p.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-500">{p.transactionReference}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600 text-sm">{formatCurrency(p.amount)}</td>
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
    </div>
  )
}
