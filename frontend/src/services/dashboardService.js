import apiClient from './api'
import { getMockStore } from './mockData'

/**
 * Dashboard & Reports Service (Person 3 Responsibility)
 * Endpoints:
 * - GET /api/v1/dashboard/admin
 * - GET /api/v1/dashboard/staff
 * - GET /api/v1/dashboard/customer
 * - GET /api/v1/reports/revenue
 * - GET /api/v1/reports/subscriptions
 */

export const dashboardService = {
  async getAdminStats() {
    try {
      const response = await apiClient.get('/api/v1/dashboard/admin')
      return response.data
    } catch (err) {
      console.warn('Live API unavailable for getAdminStats. Computing from data store.', err.message)
      const store = getMockStore()

      // Calculate MRR from active subscriptions
      const activeSubs = store.subscriptions.filter((s) => s.status === 'active')
      const mrr = activeSubs.reduce((acc, sub) => {
        let monthlyEquiv = sub.amount
        if (sub.billingFrequency === 'Yearly') monthlyEquiv = sub.amount / 12
        if (sub.billingFrequency === 'Quarterly') monthlyEquiv = sub.amount / 3
        if (sub.billingFrequency === 'Weekly') monthlyEquiv = sub.amount * 4.33
        return acc + monthlyEquiv
      }, 0)

      // Total revenue received from successful payments
      const totalRevenue = store.payments
        .filter((p) => p.status === 'success')
        .reduce((acc, p) => acc + p.amount, 0)

      const outstandingInvoices = store.invoices.filter((i) => i.balance > 0 && i.status !== 'cancelled')
      const overdueInvoices = store.invoices.filter((i) => i.status === 'overdue')
      const outstandingTotal = outstandingInvoices.reduce((acc, i) => acc + i.balance, 0)

      // Monthly revenue chart data (past 6 months)
      const revenueChart = [
        { month: 'May', revenue: 14200, recurring: 11000 },
        { month: 'Jun', revenue: 16800, recurring: 12500 },
        { month: 'Jul', revenue: 19400, recurring: 14200 },
        { month: 'Aug', revenue: 22100, recurring: 16800 },
        { month: 'Sep', revenue: 25800, recurring: 19500 },
        { month: 'Oct', revenue: Math.round(totalRevenue), recurring: Math.round(mrr) },
      ]

      // Subscription status distribution
      const statusDistribution = [
        { name: 'Active', value: store.subscriptions.filter((s) => s.status === 'active').length, color: '#10b981' },
        { name: 'Paused', value: store.subscriptions.filter((s) => s.status === 'paused').length, color: '#f59e0b' },
        { name: 'Expired', value: store.subscriptions.filter((s) => s.status === 'expired').length, color: '#64748b' },
        { name: 'Closed', value: store.subscriptions.filter((s) => s.status === 'closed').length, color: '#ef4444' },
      ]

      // Growth trend
      const growthChart = [
        { month: 'May', customers: 42, subscriptions: 38 },
        { month: 'Jun', customers: 58, subscriptions: 52 },
        { month: 'Jul', customers: 79, subscriptions: 71 },
        { month: 'Aug', customers: 98, subscriptions: 89 },
        { month: 'Sep', customers: 124, subscriptions: 112 },
        { month: 'Oct', customers: 146, subscriptions: 135 },
      ]

      return {
        totalCustomers: store.customers.length,
        activeSubscriptions: activeSubs.length,
        totalProducts: store.products.length,
        monthlyRecurringRevenue: Math.round(mrr * 100) / 100,
        revenueReceived: Math.round(totalRevenue * 100) / 100,
        outstandingInvoicesCount: outstandingInvoices.length,
        outstandingTotal: Math.round(outstandingTotal * 100) / 100,
        overdueInvoicesCount: overdueInvoices.length,
        revenueChart,
        statusDistribution,
        growthChart,
        recentCustomers: store.customers.slice(0, 5),
        recentSubscriptions: store.subscriptions.slice(0, 5),
        recentPayments: store.payments.slice(0, 5),
        urgentInvoices: outstandingInvoices.slice(0, 4),
      }
    }
  },

  async getStaffStats() {
    try {
      const response = await apiClient.get('/api/v1/dashboard/staff')
      return response.data
    } catch (err) {
      console.warn('Live API unavailable for getStaffStats. Computing from mock store.', err.message)
      const store = getMockStore()

      const activeSubs = store.subscriptions.filter((s) => s.status === 'active')
      const pendingInvoices = store.invoices.filter((i) => i.status === 'pending' || i.status === 'partially_paid')
      const overdueInvoices = store.invoices.filter((i) => i.status === 'overdue')
      const pendingQuotations = store.quotations.filter((q) => q.status === 'sent' || q.status === 'draft')

      return {
        totalCustomers: store.customers.length,
        totalQuotations: store.quotations.length,
        activeSubscriptions: activeSubs.length,
        pendingInvoicesCount: pendingInvoices.length,
        overdueInvoicesCount: overdueInvoices.length,
        recentPaymentsCount: store.payments.length,
        recentQuotations: store.quotations.slice(0, 5),
        recentSubscriptions: store.subscriptions.slice(0, 5),
        urgentInvoices: overdueInvoices.slice(0, 5),
        pendingTasks: [
          { id: 1, task: 'Follow up on Quotation QT-2026-002 with Elena Rostova', priority: 'high', due: 'Today' },
          { id: 2, task: 'Review overdue invoice INV-2026-002 ($703.00 remaining)', priority: 'urgent', due: 'Immediate' },
          { id: 3, task: 'Customer onboarding verification for Acme Technologies', priority: 'medium', due: 'Tomorrow' },
        ],
      }
    }
  },

  async getCustomerStats(customerEmail = 'customer@acme.inc') {
    try {
      const response = await apiClient.get('/api/v1/dashboard/customer', { params: { email: customerEmail } })
      return response.data
    } catch (err) {
      console.warn('Live API unavailable for getCustomerStats. Computing from mock store.', err.message)
      const store = getMockStore()

      const customerSubs = store.subscriptions.filter(
        (s) => s.customerEmail.toLowerCase() === customerEmail.toLowerCase()
      )
      const activeSub = customerSubs.find((s) => s.status === 'active') || customerSubs[0] || null

      const customerInvoices = store.invoices.filter(
        (i) => i.customerEmail.toLowerCase() === customerEmail.toLowerCase()
      )

      const customerPayments = store.payments.filter((p) => {
        const relatedInv = store.invoices.find((i) => i.id === p.invoiceId)
        return relatedInv && relatedInv.customerEmail.toLowerCase() === customerEmail.toLowerCase()
      })

      const outstandingBalance = customerInvoices.reduce((acc, i) => acc + (i.balance || 0), 0)

      return {
        currentSubscription: activeSub,
        allSubscriptions: customerSubs,
        invoices: customerInvoices,
        payments: customerPayments,
        outstandingBalance: Math.round(outstandingBalance * 100) / 100,
        unpaidInvoices: customerInvoices.filter((i) => (i.balance || 0) > 0),
      }
    }
  },
}
