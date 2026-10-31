import React, { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Download, Calendar, DollarSign, Repeat, Users, Receipt, TrendingUp } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/common/Button'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { dashboardService } from '../../services/dashboardService'
import { formatCurrency } from '../../utils/formatters'
import { useNotification } from '../../context/NotificationContext'

export function AdminReports() {
  const { showSuccess } = useNotification()
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('6months')

  useEffect(() => {
    async function load() {
      try {
        const data = await dashboardService.getAdminStats()
        setStats(data)
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const exportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      timeRange,
      mrr: stats.monthlyRecurringRevenue,
      totalRevenue: stats.revenueReceived,
      customersCount: stats.totalCustomers,
      activeSubscriptions: stats.activeSubscriptions,
    }
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `SubFlow-Financial-Report-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    showSuccess('Financial report exported successfully!')
  }

  if (isLoading || !stats) {
    return <LoadingSpinner message="Generating consolidated analytical reports..." />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive accounting audits, subscription cohort retention, and revenue throughput"
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Reports' },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="text-xs font-semibold rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 shadow-sm"
            >
              <option value="30days">Last 30 Days</option>
              <option value="6months">Last 6 Months</option>
              <option value="1year">Trailing 12 Months</option>
            </select>
            <Button variant="outline" size="sm" icon={Download} onClick={exportReport}>
              Export Report
            </Button>
          </div>
        }
      />

      {/* Cohort & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Trailing Revenue</span>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{formatCurrency(stats.revenueReceived)}</h3>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +18.2% vs prior cycle
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Current MRR Velocity</span>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{formatCurrency(stats.monthlyRecurringRevenue)}</h3>
          <p className="text-[11px] text-slate-500 mt-1">Calculated from active contracts</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Total Customer Cohorts</span>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{stats.totalCustomers}</h3>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">94.8% Retention Rate</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Active Subscriptions</span>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{stats.activeSubscriptions}</h3>
          <p className="text-[11px] text-blue-600 font-semibold mt-1">100% On-schedule billing</p>
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Growth Inflow */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-1">Customer & Subscription Expansion</h3>
          <p className="text-xs text-slate-500 mb-4">Total active customer footprint vs subscription volume</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.growthChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0' }}
                />
                <Legend />
                <Line type="monotone" dataKey="customers" name="Total Customers" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="subscriptions" name="Active Subscriptions" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Performance Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-1">Monthly Billing Realization</h3>
          <p className="text-xs text-slate-500 mb-4">Cash collections compared with projected recurring revenue</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v) => [formatCurrency(v), '']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0' }}
                />
                <Legend />
                <Bar dataKey="revenue" name="Actual Collections" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="recurring" name="Base Recurring" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
