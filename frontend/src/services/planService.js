import apiClient from './api'
import { getMockStore, saveMockStore } from './mockData'

/**
 * Subscription Plan Service (Person 1 Responsibility)
 * Endpoints:
 * - GET    /api/v1/plans
 * - GET    /api/v1/plans/:id
 * - POST   /api/v1/plans
 * - PUT    /api/v1/plans/:id
 * - DELETE /api/v1/plans/:id
 */

export const planService = {
  async getPlans(params = {}) {
    try {
      const response = await apiClient.get('/api/v1/plans', { params })
      return response.data
    } catch (err) {
      console.warn('Live API unavailable for getPlans. Using mock store fallback.')
      const store = getMockStore()
      let list = [...store.plans]
      if (params.search) {
        const q = params.search.toLowerCase()
        list = list.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
      }
      if (params.frequency && params.frequency !== 'all') {
        list = list.filter((p) => p.billingFrequency.toLowerCase() === params.frequency.toLowerCase())
      }
      if (params.status && params.status !== 'all') {
        list = list.filter((p) => p.status === params.status)
      }
      return list
    }
  },

  async getPlanById(id) {
    try {
      const response = await apiClient.get(`/api/v1/plans/${id}`)
      return response.data
    } catch (err) {
      const store = getMockStore()
      const found = store.plans.find((p) => p.id === id)
      if (!found) throw new Error('Plan not found')
      return found
    }
  },

  async createPlan(data) {
    try {
      const response = await apiClient.post('/api/v1/plans', data)
      return response.data
    } catch (err) {
      const store = getMockStore()
      const newPlan = {
        id: `plan_${Date.now()}`,
        name: data.name,
        code: data.code || `PLAN-${data.name.substring(0, 3).toUpperCase()}`,
        billingFrequency: data.billingFrequency || 'Monthly',
        basePrice: parseFloat(data.basePrice) || 0,
        setupFee: parseFloat(data.setupFee) || 0,
        minimumQuantity: parseInt(data.minimumQuantity) || 1,
        availabilityDate: data.availabilityDate || new Date().toISOString().split('T')[0],
        description: data.description || '',
        pauseSettings: data.pauseSettings || { allowed: true, maxPauseDurationDays: 30, pauseFee: 0 },
        renewalSettings: data.renewalSettings || { autoRenew: true, reminderDaysBefore: 7 },
        closureSettings: data.closureSettings || { cancellationNoticeDays: 7, refundPolicy: 'Prorated' },
        status: data.status || 'active',
      }
      store.plans.unshift(newPlan)
      saveMockStore(store)
      return newPlan
    }
  },

  async updatePlan(id, updates) {
    try {
      const response = await apiClient.put(`/api/v1/plans/${id}`, updates)
      return response.data
    } catch (err) {
      const store = getMockStore()
      const index = store.plans.findIndex((p) => p.id === id)
      if (index === -1) throw new Error('Plan not found')
      store.plans[index] = {
        ...store.plans[index],
        ...updates,
        basePrice: updates.basePrice !== undefined ? parseFloat(updates.basePrice) : store.plans[index].basePrice,
        setupFee: updates.setupFee !== undefined ? parseFloat(updates.setupFee) : store.plans[index].setupFee,
      }
      saveMockStore(store)
      return store.plans[index]
    }
  },

  async deletePlan(id) {
    try {
      const response = await apiClient.delete(`/api/v1/plans/${id}`)
      return response.data
    } catch (err) {
      const store = getMockStore()
      store.plans = store.plans.filter((p) => p.id !== id)
      saveMockStore(store)
      return { success: true, message: 'Plan deleted' }
    }
  },

  async togglePlanStatus(id) {
    const plan = await this.getPlanById(id)
    const newStatus = plan.status === 'active' ? 'inactive' : 'active'
    return this.updatePlan(id, { status: newStatus })
  },
}
