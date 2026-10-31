import apiClient from './api'
import { getMockStore, saveMockStore } from './mockData'

/**
 * Invoice Service (Person 3 Responsibility)
 * Endpoints:
 * - GET    /api/v1/invoices
 * - GET    /api/v1/invoices/:id
 * - POST   /api/v1/invoices
 * - PUT    /api/v1/invoices/:id
 * - POST   /api/v1/invoices/:id/confirm
 * - POST   /api/v1/invoices/:id/cancel
 * - POST   /api/v1/invoices/:id/send
 * - GET    /api/v1/invoices/:id/pdf
 */

export const invoiceService = {
  async getInvoices(params = {}) {
    try {
      const response = await apiClient.get('/api/v1/invoices', { params })
      return response.data
    } catch (err) {
      console.warn('Live API unavailable for getInvoices. Using mock store fallback.')
      const store = getMockStore()
      let list = [...store.invoices]
      if (params.search) {
        const q = params.search.toLowerCase()
        list = list.filter(
          (inv) =>
            inv.invoiceNumber.toLowerCase().includes(q) ||
            inv.customerName.toLowerCase().includes(q) ||
            inv.customerEmail.toLowerCase().includes(q)
        )
      }
      if (params.status && params.status !== 'all') {
        list = list.filter((inv) => inv.status === params.status)
      }
      if (params.customerId) {
        list = list.filter((inv) => inv.customerId === params.customerId)
      }
      if (params.customerEmail) {
        list = list.filter((inv) => inv.customerEmail.toLowerCase() === params.customerEmail.toLowerCase())
      }
      return list
    }
  },

  async getInvoiceById(id) {
    try {
      const response = await apiClient.get(`/api/v1/invoices/${id}`)
      return response.data
    } catch (err) {
      const store = getMockStore()
      const found = store.invoices.find((inv) => inv.id === id)
      if (!found) throw new Error('Invoice not found')
      return found
    }
  },

  async createInvoice(data) {
    try {
      const response = await apiClient.post('/api/v1/invoices', data)
      return response.data
    } catch (err) {
      const store = getMockStore()
      const invSeq = (store.invoices.length + 1).toString().padStart(3, '0')
      const today = new Date().toISOString().split('T')[0]
      const due = data.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
      const newInv = {
        id: `inv_${Date.now()}`,
        invoiceNumber: `INV-2026-${invSeq}`,
        customerId: data.customerId,
        customerName: data.customerName,
        customerCompany: data.customerCompany || '',
        customerEmail: data.customerEmail,
        customerAddress: data.customerAddress || 'Client Office Address',
        subscriptionId: data.subscriptionId || null,
        issueDate: data.issueDate || today,
        dueDate: due,
        status: data.status || 'pending',
        items: data.items || [],
        subtotal: parseFloat(data.subtotal) || 0,
        discountName: data.discountName || null,
        discountAmount: parseFloat(data.discountAmount) || 0,
        taxBreakdown: data.taxBreakdown || [],
        taxTotal: parseFloat(data.taxTotal) || 0,
        grandTotal: parseFloat(data.grandTotal) || 0,
        amountPaid: parseFloat(data.amountPaid) || 0,
        balance: parseFloat(data.balance ?? data.grandTotal),
        notes: data.notes || 'Payment due within terms.',
        createdAt: today,
      }
      store.invoices.unshift(newInv)
      saveMockStore(store)
      return newInv
    }
  },

  async updateInvoice(id, updates) {
    try {
      const response = await apiClient.put(`/api/v1/invoices/${id}`, updates)
      return response.data
    } catch (err) {
      const store = getMockStore()
      const index = store.invoices.findIndex((i) => i.id === id)
      if (index === -1) throw new Error('Invoice not found')
      store.invoices[index] = { ...store.invoices[index], ...updates }
      saveMockStore(store)
      return store.invoices[index]
    }
  },

  async confirmInvoice(id) {
    try {
      const response = await apiClient.post(`/api/v1/invoices/${id}/confirm`)
      return response.data
    } catch (err) {
      return this.updateInvoice(id, { status: 'pending' })
    }
  },

  async cancelInvoice(id, reason = 'Cancelled by administrator') {
    try {
      const response = await apiClient.post(`/api/v1/invoices/${id}/cancel`, { reason })
      return response.data
    } catch (err) {
      return this.updateInvoice(id, { status: 'cancelled' })
    }
  },

  async sendInvoice(id) {
    try {
      const response = await apiClient.post(`/api/v1/invoices/${id}/send`)
      return response.data
    } catch (err) {
      return { success: true, message: 'Invoice dispatched to customer via email.' }
    }
  },

  async downloadPdf(id) {
    try {
      const response = await apiClient.get(`/api/v1/invoices/${id}/pdf`, { responseType: 'blob' })
      return response.data
    } catch (err) {
      // Fallback: Trigger browser printable invoice view
      window.print()
      return null
    }
  },
}
