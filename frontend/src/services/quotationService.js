import apiClient from './api'
import { getMockStore, saveMockStore } from './mockData'

/**
 * Quotation Service (Person 2 Responsibility)
 * Endpoints:
 * - GET    /api/v1/quotations
 * - GET    /api/v1/quotations/:id
 * - POST   /api/v1/quotations
 * - PUT    /api/v1/quotations/:id
 * - DELETE /api/v1/quotations/:id
 * - POST   /api/v1/quotations/:id/send
 * - POST   /api/v1/quotations/:id/approve
 * - POST   /api/v1/quotations/:id/reject
 * - POST   /api/v1/quotations/:id/convert-to-subscription
 */

export const quotationService = {
  async getQuotations(params = {}) {
    try {
      const response = await apiClient.get('/api/v1/quotations', { params })
      return response.data
    } catch (err) {
      console.warn('Live API unavailable for getQuotations. Using mock store fallback.')
      const store = getMockStore()
      let list = [...store.quotations]
      if (params.search) {
        const q = params.search.toLowerCase()
        list = list.filter(
          (item) =>
            item.quotationNumber.toLowerCase().includes(q) ||
            item.customerName.toLowerCase().includes(q) ||
            item.customerEmail.toLowerCase().includes(q)
        )
      }
      if (params.status && params.status !== 'all') {
        list = list.filter((item) => item.status === params.status)
      }
      if (params.customerId) {
        list = list.filter((item) => item.customerId === params.customerId)
      }
      return list
    }
  },

  async getQuotationById(id) {
    try {
      const response = await apiClient.get(`/api/v1/quotations/${id}`)
      return response.data
    } catch (err) {
      const store = getMockStore()
      const found = store.quotations.find((q) => q.id === id)
      if (!found) throw new Error('Quotation not found')
      return found
    }
  },

  async createQuotation(data) {
    try {
      const response = await apiClient.post('/api/v1/quotations', data)
      return response.data
    } catch (err) {
      const store = getMockStore()
      const seq = (store.quotations.length + 1).toString().padStart(3, '0')
      const newQuot = {
        id: `quot_${Date.now()}`,
        quotationNumber: `QT-2026-${seq}`,
        customerId: data.customerId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        template: data.template || 'Standard Template',
        issueDate: data.issueDate || new Date().toISOString().split('T')[0],
        validityDate: data.validityDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        status: data.status || 'draft',
        items: data.items || [],
        subtotal: parseFloat(data.subtotal) || 0,
        discountType: data.discountType || 'none',
        discountValue: parseFloat(data.discountValue) || 0,
        discountAmount: parseFloat(data.discountAmount) || 0,
        taxRate: parseFloat(data.taxRate) || 0,
        taxAmount: parseFloat(data.taxAmount) || 0,
        grandTotal: parseFloat(data.grandTotal) || 0,
        notes: data.notes || '',
        terms: data.terms || '',
        convertedSubscriptionId: null,
        createdAt: new Date().toISOString().split('T')[0],
      }
      store.quotations.unshift(newQuot)
      saveMockStore(store)
      return newQuot
    }
  },

  async updateQuotation(id, updates) {
    try {
      const response = await apiClient.put(`/api/v1/quotations/${id}`, updates)
      return response.data
    } catch (err) {
      const store = getMockStore()
      const index = store.quotations.findIndex((q) => q.id === id)
      if (index === -1) throw new Error('Quotation not found')
      store.quotations[index] = { ...store.quotations[index], ...updates }
      saveMockStore(store)
      return store.quotations[index]
    }
  },

  async deleteQuotation(id) {
    try {
      const response = await apiClient.delete(`/api/v1/quotations/${id}`)
      return response.data
    } catch (err) {
      const store = getMockStore()
      store.quotations = store.quotations.filter((q) => q.id !== id)
      saveMockStore(store)
      return { success: true, message: 'Quotation deleted' }
    }
  },

  async sendQuotation(id) {
    try {
      const response = await apiClient.post(`/api/v1/quotations/${id}/send`)
      return response.data
    } catch (err) {
      return this.updateQuotation(id, { status: 'sent' })
    }
  },

  async approveQuotation(id) {
    try {
      const response = await apiClient.post(`/api/v1/quotations/${id}/approve`)
      return response.data
    } catch (err) {
      return this.updateQuotation(id, { status: 'approved' })
    }
  },

  async rejectQuotation(id) {
    try {
      const response = await apiClient.post(`/api/v1/quotations/${id}/reject`)
      return response.data
    } catch (err) {
      return this.updateQuotation(id, { status: 'rejected' })
    }
  },

  /**
   * Convert quotation into active subscription and generate corresponding invoice
   */
  async convertToSubscription(id, options = {}) {
    try {
      const response = await apiClient.post(`/api/v1/quotations/${id}/convert-to-subscription`, options)
      return response.data
    } catch (err) {
      console.warn('Live API unavailable for convertToSubscription. Converting via local store.')
      const store = getMockStore()
      const quotation = store.quotations.find((q) => q.id === id)
      if (!quotation) throw new Error('Quotation not found')

      const subId = `sub_${Date.now()}`
      const subSeq = (store.subscriptions.length + 1).toString().padStart(3, '0')
      const invSeq = (store.invoices.length + 1).toString().padStart(3, '0')

      const today = new Date().toISOString().split('T')[0]
      const expiry = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]
      const nextBill = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

      const newSubscription = {
        id: subId,
        subscriptionNumber: `SUB-2026-${subSeq}`,
        customerId: quotation.customerId,
        customerName: quotation.customerName,
        customerCompany: quotation.customerName.includes('(')
          ? quotation.customerName.split('(')[1].replace(')', '')
          : '',
        customerEmail: quotation.customerEmail,
        planId: options.planId || store.plans[0]?.id || 'plan_starter_monthly',
        planName: options.planName || store.plans[0]?.name || 'Starter Pro - Monthly',
        billingFrequency: options.billingFrequency || 'Monthly',
        amount: quotation.grandTotal,
        quantity: 1,
        status: 'active',
        startDate: today,
        expiryDate: expiry,
        nextBillingDate: nextBill,
        paymentMethod: options.paymentMethod || 'Razorpay / Card',
        productLines: quotation.items.map((i) => ({
          productName: i.productName,
          variant: i.variantName,
          qty: i.quantity,
          price: i.unitPrice,
        })),
        history: [
          { date: today, action: `Converted from Quotation ${quotation.quotationNumber}`, actor: 'Logged-in User' },
          { date: today, action: 'Subscription activated', actor: 'System' },
        ],
        createdAt: today,
      }

      // Generate invoice
      const newInvoice = {
        id: `inv_${Date.now()}`,
        invoiceNumber: `INV-2026-${invSeq}`,
        customerId: quotation.customerId,
        customerName: quotation.customerName,
        customerCompany: newSubscription.customerCompany,
        customerEmail: quotation.customerEmail,
        customerAddress: 'Primary Customer Billing Address',
        subscriptionId: subId,
        issueDate: today,
        dueDate: nextBill,
        status: 'pending',
        items: quotation.items.map((i) => ({
          description: `${i.productName} (${i.variantName})`,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.totalPrice,
        })),
        subtotal: quotation.subtotal,
        discountName: quotation.discountValue ? `Quotation Discount (${quotation.discountValue}%)` : null,
        discountAmount: quotation.discountAmount,
        taxBreakdown: quotation.taxAmount ? [{ name: 'Tax', rate: quotation.taxRate, amount: quotation.taxAmount }] : [],
        taxTotal: quotation.taxAmount,
        grandTotal: quotation.grandTotal,
        amountPaid: 0,
        balance: quotation.grandTotal,
        notes: `Generated upon converting quotation ${quotation.quotationNumber}.`,
        createdAt: today,
      }

      // Mark quotation converted
      quotation.status = 'converted'
      quotation.convertedSubscriptionId = subId

      store.subscriptions.unshift(newSubscription)
      store.invoices.unshift(newInvoice)
      saveMockStore(store)

      return {
        subscription: newSubscription,
        invoice: newInvoice,
        message: 'Quotation successfully converted to active subscription!',
      }
    }
  },
}
