import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Repeat,
  Package,
  TrendingUp,
  CreditCard,
  AlertCircle,
  FileText,
  ArrowUpRight,
  Receipt,
  DollarSign,
  Plus,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/common/Button'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { dashboardService } from '../../services/dashboardService'
import { formatCurrency, formatDate } from '../../utils/formatters'

export function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await dashboardService.getAdminStats()
        setStats(data)
      } catch (err) {
        console.error('Failed to load admin stats', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadStats()
  }, [])

  if (isLoading || !stats) {
    return <LoadingSpinner message="Aggregating metrics and charts from backend..." />
  }

  const statCards = [
    {
      label: 'Monthly Recurring Revenue',
      value: formatCurrency(stats.monthlyRecurringRevenue),
      subtext: '+12.4% from last month',
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Total Revenue Received',
      value: formatCurrency(stats.revenueReceived),
      subtext: 'Verified collections',
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Active Subscriptions',
      value: stats.activeSubscriptions,
      subtext: `${stats.totalCustomers} total clients`,
      icon: Repeat,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Outstanding Invoices',
      value: formatCurrency(stats.outstandingTotal),
      subtext: `${stats.outstandingInvoicesCount} invoices pending`,
      icon: Receipt,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Overdue Invoices',
      value: stats.overdueInvoicesCount,
      subtext: 'Action required immediately',
      icon: AlertCircle,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
    {
      label: 'Catalog Products',
      value: stats.totalProducts,
      subtext: 'Active plans & items',
      icon: Package,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Overview"
        description="Real-time commercial subscription intelligence, revenue throughput, and billing performance"
        actions={
          <>
            <Link to="/admin/quotations">
              <Button variant="outline" size="sm" icon={FileText}>
                New Quotation
              </Button>
            </Link>
            <Link to="/admin/products/create">
              <Button variant="primary" size="sm" icon={Plus}>
                Create Product
              </Button>
            </Link>
          </>
        }
      />

      {/* Top Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 line-clamp-1">{card.label}</span>
              <div className={`w-8 h-8 rounded-xl ${card.bg} ${card.color} flex items-center justify-center flex-shrink-0`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{card.value}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{card.subtext}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Primary Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Revenue & MRR Momentum</h3>
              <p className="text-xs text-slate-500">Collected cash receipts vs recurring monthly trajectory</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              Past 6 Months
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenueChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), '']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0' }}
                />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="Total Collections" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="recurring" name="Monthly Recurring (MRR)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRec)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subscription Distribution Donut */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Subscription Status</h3>
            <p className="text-xs text-slate-500 mb-4">Distribution by current lifecycle state</p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusDistribution}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Subscriptions']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100 text-xs">
            {stats.statusDistribution.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 font-medium">{item.name}:</span>
                <span className="font-bold text-slate-900 ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Growth Trend & Operational Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Subscriptions */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Active Subscriptions</h3>
              <p className="text-xs text-slate-500">Latest ongoing customer subscriptions</p>
            </div>
            <Link to="/admin/subscriptions" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Subscription</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentSubscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50">
                    <td className="py-3">
                      <p className="font-bold text-slate-900">{sub.subscriptionNumber}</p>
                      <p className="text-slate-500 text-[11px]">{sub.planName}</p>
                    </td>
                    <td className="py-3 font-medium text-slate-800">{sub.customerName}</td>
                    <td className="py-3 font-bold text-slate-900">{formatCurrency(sub.amount)}</td>
                    <td className="py-3">
                      <StatusBadge status={sub.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Urgent Overdue & Outstanding Invoices */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Pending Collections</h3>
              <p className="text-xs text-slate-500">Unsettled accounts receivable</p>
            </div>
            <Link to="/admin/invoices" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Manage Invoices <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Invoice</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Due Date</th>
                  <th className="pb-3">Balance</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.urgentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50">
                    <td className="py-3 font-bold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="py-3 font-medium text-slate-800">{inv.customerName}</td>
                    <td className="py-3 text-slate-500">{formatDate(inv.dueDate)}</td>
                    <td className="py-3 font-bold text-rose-600">{formatCurrency(inv.balance)}</td>
                    <td className="py-3">
                      <StatusBadge status={inv.status} />
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
