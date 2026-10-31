import apiClient from './api'
import { getMockStore, saveMockStore } from './mockData'

/**
 * Payment Service (Person 3 Responsibility)
 * Endpoints:
 * - GET  /api/v1/payments
 * - GET  /api/v1/payments/:id
 * - POST /api/v1/payments/record
 * - GET  /api/v1/invoices/:invoiceId/payments
 */

export const paymentService = {
  async getPayments(params = {}) {
    try {
      const response = await apiClient.get('/api/v1/payments', { params })
      return response.data
    } catch (err) {
      console.warn('Live API unavailable for getPayments. Using mock store fallback.')
      const store = getMockStore()
      let list = [...store.payments]
      if (params.search) {
        const q = params.search.toLowerCase()
        list = list.filter(
          (p) =>
            p.paymentNumber.toLowerCase().includes(q) ||
            p.invoiceNumber.toLowerCase().includes(q) ||
            p.customerName.toLowerCase().includes(q) ||
            (p.transactionReference && p.transactionReference.toLowerCase().includes(q))
        )
      }
      if (params.method && params.method !== 'all') {
        list = list.filter((p) => p.method.toLowerCase() === params.method.toLowerCase())
      }
      if (params.status && params.status !== 'all') {
        list = list.filter((p) => p.status === params.status)
      }
      if (params.customerId) {
        list = list.filter((p) => p.customerId === params.customerId)
      }
      return list
    }
  },

  async getPaymentById(id) {
    try {
      const response = await apiClient.get(`/api/v1/payments/${id}`)
      return response.data
    } catch (err) {
      const store = getMockStore()
      const found = store.payments.find((p) => p.id === id)
      if (!found) throw new Error('Payment record not found')
      return found
    }
  },

  async recordPayment(data) {
    try {
      const response = await apiClient.post('/api/v1/payments/record', data)
      return response.data
    } catch (err) {
      console.warn('Live API unavailable for recordPayment. Recording in mock store.')
      const store = getMockStore()
      const invoice = store.invoices.find((i) => i.id === data.invoiceId)
      if (!invoice) throw new Error('Related invoice not found')

      const amountToPay = parseFloat(data.amount)
      if (isNaN(amountToPay) || amountToPay <= 0) {
        throw new Error('Please enter a valid positive payment amount.')
      }

      const paySeq = (store.payments.length + 1).toString().padStart(3, '0')
      const today = new Date().toISOString().split('T')[0]
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19)

      const newPayment = {
        id: `pay_${Date.now()}`,
        paymentNumber: `PAY-2026-${paySeq}`,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: amountToPay,
        method: data.method || 'Manual / Cash',
        transactionReference: data.transactionReference || `TXN-${Date.now().toString().slice(-6)}`,
        status: 'success',
        paymentDate: data.paymentDate || nowStr,
        notes: data.notes || '',
        createdAt: today,
      }

      // Update invoice paid amount and remaining balance
      const newAmountPaid = (invoice.amountPaid || 0) + amountToPay
      const newBalance = Math.max(0, invoice.grandTotal - newAmountPaid)

      invoice.amountPaid = Math.round(newAmountPaid * 100) / 100
      invoice.balance = Math.round(newBalance * 100) / 100

      if (invoice.balance <= 0) {
        invoice.status = 'paid'
      } else {
        invoice.status = 'partially_paid'
      }

      store.payments.unshift(newPayment)
      saveMockStore(store)

      return {
        payment: newPayment,
        invoice,
        message: 'Payment recorded successfully!',
      }
    }
  },
}
