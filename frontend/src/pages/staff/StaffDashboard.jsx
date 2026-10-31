import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  FileText,
  Repeat,
  Receipt,
  AlertCircle,
  CreditCard,
  CheckCircle2,
  Plus,
  ArrowRight,
  Clock,
} from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/common/Button'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { dashboardService } from '../../services/dashboardService'
import { formatCurrency, formatDate } from '../../utils/formatters'

export function StaffDashboard() {
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await dashboardService.getStaffStats()
        setStats(data)
      } catch (err) {
        console.error('Failed to load staff stats', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  if (isLoading || !stats) {
    return <LoadingSpinner message="Loading staff operational console..." />
  }

  const statCards = [
    { label: 'Assigned Customers', value: stats.totalCustomers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Quotations', value: stats.totalQuotations, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Active Subscriptions', value: stats.activeSubscriptions, icon: Repeat, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending Invoices', value: stats.pendingInvoicesCount, icon: Receipt, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Overdue Invoices', value: stats.overdueInvoicesCount, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Processed Payments', value: stats.recentPaymentsCount, icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Operations Console"
        description="Daily operational dispatch, customer workflows, quotation follow-ups, and payment records"
        actions={
          <>
            <Link to="/staff/quotations">
              <Button variant="primary" size="sm" icon={Plus}>
                Create Quotation
              </Button>
            </Link>
            <Link to="/staff/payments">
              <Button variant="outline" size="sm" icon={CreditCard}>
                Record Payment
              </Button>
            </Link>
          </>
        }
      />

      {/* Grid of Operational Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card, idx) => (
          <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className={`w-8 h-8 rounded-xl ${card.bg} ${card.color} flex items-center justify-center mb-2`}>
              <card.icon className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-slate-500">{card.label}</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{card.value}</h3>
          </div>
        ))}
      </div>

      {/* Tasks & Urgent Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Operational Tasks */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-1">Operational Action Items</h3>
          <p className="text-xs text-slate-500 mb-4">Priority follow-ups assigned to customer success</p>
          <div className="space-y-3">
            {stats.pendingTasks.map((t) => (
              <div key={t.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-start gap-3">
                <Clock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 leading-snug">{t.task}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        t.priority === 'urgent'
                          ? 'bg-rose-100 text-rose-700'
                          : t.priority === 'high'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {t.priority}
                    </span>
                    <span className="text-[11px] text-slate-500">Due: {t.due}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Quotations requiring action */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Quotations</h3>
              <p className="text-xs text-slate-500">Track active proposal engagements and conversion status</p>
            </div>
            <Link to="/staff/quotations" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              All Quotations <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Quotation</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Total</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentQuotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/50">
                    <td className="py-3 font-bold text-slate-900">{q.quotationNumber}</td>
                    <td className="py-3 text-slate-700 font-medium">{q.customerName}</td>
                    <td className="py-3 text-slate-500">{formatDate(q.issueDate)}</td>
                    <td className="py-3 font-bold text-slate-900">{formatCurrency(q.grandTotal)}</td>
                    <td className="py-3">
                      <StatusBadge status={q.status} />
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
