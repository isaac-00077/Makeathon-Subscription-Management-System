import apiClient from './api'
import { getMockStore, saveMockStore } from './mockData'

/**
 * Subscription Service (Person 2 Responsibility)
 * Endpoints:
 * - GET    /api/v1/subscriptions
 * - GET    /api/v1/subscriptions/:id
 * - POST   /api/v1/subscriptions
 * - PUT    /api/v1/subscriptions/:id
 * - POST   /api/v1/subscriptions/:id/activate
 * - POST   /api/v1/subscriptions/:id/pause
 * - POST   /api/v1/subscriptions/:id/resume
 * - POST   /api/v1/subscriptions/:id/renew
 * - POST   /api/v1/subscriptions/:id/close
 */

export const subscriptionService = {
  async getSubscriptions(params = {}) {
    try {
      const response = await apiClient.get('/api/v1/subscriptions', { params })
      return response.data
    } catch (err) {
      console.warn('Live API unavailable for getSubscriptions. Using mock store fallback.')
      const store = getMockStore()
      let list = [...store.subscriptions]
      if (params.search) {
        const q = params.search.toLowerCase()
        list = list.filter(
          (s) =>
            s.subscriptionNumber.toLowerCase().includes(q) ||
            s.customerName.toLowerCase().includes(q) ||
            s.customerEmail.toLowerCase().includes(q) ||
            s.planName.toLowerCase().includes(q)
        )
      }
      if (params.status && params.status !== 'all') {
        list = list.filter((s) => s.status === params.status)
      }
      if (params.customerId) {
        list = list.filter((s) => s.customerId === params.customerId)
      }
      if (params.customerEmail) {
        list = list.filter((s) => s.customerEmail.toLowerCase() === params.customerEmail.toLowerCase())
      }
      return list
    }
  },

  async getSubscriptionById(id) {
    try {
      const response = await apiClient.get(`/api/v1/subscriptions/${id}`)
      return response.data
    } catch (err) {
      const store = getMockStore()
      const found = store.subscriptions.find((s) => s.id === id)
      if (!found) throw new Error('Subscription not found')
      return found
    }
  },

  async createSubscription(data) {
    try {
      const response = await apiClient.post('/api/v1/subscriptions', data)
      return response.data
    } catch (err) {
      const store = getMockStore()
      const subSeq = (store.subscriptions.length + 1).toString().padStart(3, '0')
      const today = new Date().toISOString().split('T')[0]
      const newSub = {
        id: `sub_${Date.now()}`,
        subscriptionNumber: `SUB-2026-${subSeq}`,
        customerId: data.customerId,
        customerName: data.customerName,
        customerCompany: data.customerCompany || '',
        customerEmail: data.customerEmail,
        planId: data.planId,
        planName: data.planName,
        billingFrequency: data.billingFrequency || 'Monthly',
        amount: parseFloat(data.amount) || 0,
        quantity: parseInt(data.quantity) || 1,
        status: data.status || 'active',
        startDate: data.startDate || today,
        expiryDate: data.expiryDate,
        nextBillingDate: data.nextBillingDate,
        paymentMethod: data.paymentMethod || 'Razorpay / Card',
        productLines: data.productLines || [],
        history: [{ date: today, action: 'Subscription created manually', actor: 'Staff' }],
        createdAt: today,
      }
      store.subscriptions.unshift(newSub)
      saveMockStore(store)
      return newSub
    }
  },

  async updateSubscription(id, updates) {
    try {
      const response = await apiClient.put(`/api/v1/subscriptions/${id}`, updates)
      return response.data
    } catch (err) {
      const store = getMockStore()
      const index = store.subscriptions.findIndex((s) => s.id === id)
      if (index === -1) throw new Error('Subscription not found')
      store.subscriptions[index] = { ...store.subscriptions[index], ...updates }
      saveMockStore(store)
      return store.subscriptions[index]
    }
  },

  async activateSubscription(id) {
    try {
      const response = await apiClient.post(`/api/v1/subscriptions/${id}/activate`)
      return response.data
    } catch (err) {
      const today = new Date().toISOString().split('T')[0]
      const sub = await this.getSubscriptionById(id)
      const history = [...(sub.history || []), { date: today, action: 'Subscription Activated', actor: 'Admin' }]
      return this.updateSubscription(id, { status: 'active', history })
    }
  },

  async pauseSubscription(id, reason = 'Paused by administrator') {
    try {
      const response = await apiClient.post(`/api/v1/subscriptions/${id}/pause`, { reason })
      return response.data
    } catch (err) {
      const today = new Date().toISOString().split('T')[0]
      const sub = await this.getSubscriptionById(id)
      const history = [...(sub.history || []), { date: today, action: `Subscription Paused (${reason})`, actor: 'Admin/Staff' }]
      return this.updateSubscription(id, { status: 'paused', history })
    }
  },

  async resumeSubscription(id) {
    try {
      const response = await apiClient.post(`/api/v1/subscriptions/${id}/resume`)
      return response.data
    } catch (err) {
      const today = new Date().toISOString().split('T')[0]
      const sub = await this.getSubscriptionById(id)
      const history = [...(sub.history || []), { date: today, action: 'Subscription Resumed', actor: 'Admin/Staff' }]
      return this.updateSubscription(id, { status: 'active', history })
    }
  },

  async renewSubscription(id) {
    try {
      const response = await apiClient.post(`/api/v1/subscriptions/${id}/renew`)
      return response.data
    } catch (err) {
      const today = new Date().toISOString().split('T')[0]
      const sub = await this.getSubscriptionById(id)
      const newExpiry = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]
      const newNextBill = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
      const history = [
        ...(sub.history || []),
        { date: today, action: `Renewed for next billing cycle (extended to ${newExpiry})`, actor: 'System / User' },
      ]
      return this.updateSubscription(id, {
        status: 'active',
        expiryDate: newExpiry,
        nextBillingDate: newNextBill,
        history,
      })
    }
  },

  async closeSubscription(id, reason = 'Customer request / term completion') {
    try {
      const response = await apiClient.post(`/api/v1/subscriptions/${id}/close`, { reason })
      return response.data
    } catch (err) {
      const today = new Date().toISOString().split('T')[0]
      const sub = await this.getSubscriptionById(id)
      const history = [...(sub.history || []), { date: today, action: `Subscription Terminated/Closed (${reason})`, actor: 'Admin' }]
      return this.updateSubscription(id, { status: 'closed', history })
    }
  },
}
