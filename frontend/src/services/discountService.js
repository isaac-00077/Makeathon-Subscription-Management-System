import apiClient from './api'
import { getMockStore, saveMockStore } from './mockData'

/**
 * Discount Management Service (Person 3 Responsibility)
 * Endpoints:
 * - GET    /api/v1/discounts
 * - GET    /api/v1/discounts/:id
 * - POST   /api/v1/discounts
 * - PUT    /api/v1/discounts/:id
 * - DELETE /api/v1/discounts/:id
 * - POST   /api/v1/discounts/validate
 */

export const discountService = {
  async getDiscounts(params = {}) {
    try {
      const response = await apiClient.get('/api/v1/discounts', { params })
      return response.data
    } catch (err) {
      console.warn('Live API unavailable for getDiscounts. Using mock store fallback.')
      const store = getMockStore()
      let list = [...store.discounts]
      if (params.search) {
        const q = params.search.toLowerCase()
        list = list.filter((d) => d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q))
      }
      if (params.type && params.type !== 'all') {
        list = list.filter((d) => d.type === params.type)
      }
      if (params.status && params.status !== 'all') {
        list = list.filter((d) => d.status === params.status)
      }
      return list
    }
  },

  async getDiscountById(id) {
    try {
      const response = await apiClient.get(`/api/v1/discounts/${id}`)
      return response.data
    } catch (err) {
      const store = getMockStore()
      const found = store.discounts.find((d) => d.id === id)
      if (!found) throw new Error('Discount not found')
      return found
    }
  },

  async createDiscount(data) {
    try {
      const response = await apiClient.post('/api/v1/discounts', data)
      return response.data
    } catch (err) {
      const store = getMockStore()
      const newDisc = {
        id: `disc_${Date.now()}`,
        code: data.code.toUpperCase().trim(),
        name: data.name,
        type: data.type || 'percentage', // percentage or fixed
        value: parseFloat(data.value) || 0,
        minPurchase: parseFloat(data.minPurchase) || 0,
        minQuantity: parseInt(data.minQuantity) || 1,
        applicableProducts: data.applicableProducts || ['all'],
        startDate: data.startDate || new Date().toISOString().split('T')[0],
        endDate: data.endDate || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
        usageLimit: parseInt(data.usageLimit) || 100,
        currentUsage: 0,
        status: data.status || 'active',
      }
      store.discounts.unshift(newDisc)
      saveMockStore(store)
      return newDisc
    }
  },

  async updateDiscount(id, updates) {
    try {
      const response = await apiClient.put(`/api/v1/discounts/${id}`, updates)
      return response.data
    } catch (err) {
      const store = getMockStore()
      const index = store.discounts.findIndex((d) => d.id === id)
      if (index === -1) throw new Error('Discount not found')
      store.discounts[index] = {
        ...store.discounts[index],
        ...updates,
        value: updates.value !== undefined ? parseFloat(updates.value) : store.discounts[index].value,
        minPurchase: updates.minPurchase !== undefined ? parseFloat(updates.minPurchase) : store.discounts[index].minPurchase,
      }
      saveMockStore(store)
      return store.discounts[index]
    }
  },

  async deleteDiscount(id) {
    try {
      const response = await apiClient.delete(`/api/v1/discounts/${id}`)
      return response.data
    } catch (err) {
      const store = getMockStore()
      store.discounts = store.discounts.filter((d) => d.id !== id)
      saveMockStore(store)
      return { success: true, message: 'Discount deleted' }
    }
  },

  async toggleDiscountStatus(id) {
    const disc = await this.getDiscountById(id)
    const newStatus = disc.status === 'active' ? 'inactive' : 'active'
    return this.updateDiscount(id, { status: newStatus })
  },

  async validateDiscountCode(code, subtotal = 0, quantity = 1) {
    try {
      const response = await apiClient.post('/api/v1/discounts/validate', { code, subtotal, quantity })
      return response.data
    } catch (err) {
      const store = getMockStore()
      const disc = store.discounts.find((d) => d.code.toUpperCase() === code.toUpperCase().trim())
      if (!disc) {
        throw new Error('Invalid discount code')
      }
      if (disc.status !== 'active') {
        throw new Error('This discount code is inactive')
      }
      const now = new Date()
      if (new Date(disc.startDate) > now || new Date(disc.endDate) < now) {
        throw new Error('This discount code has expired')
      }
      if (subtotal < disc.minPurchase) {
        throw new Error(`Minimum purchase of $${disc.minPurchase} required for this discount`)
      }
      if (quantity < disc.minQuantity) {
        throw new Error(`Minimum quantity of ${disc.minQuantity} items required for this discount`)
      }
      if (disc.currentUsage >= disc.usageLimit) {
        throw new Error('This discount code has reached its maximum usage limit')
      }

      let calculatedDiscount = 0
      if (disc.type === 'percentage') {
        calculatedDiscount = (subtotal * disc.value) / 100
      } else {
        calculatedDiscount = Math.min(disc.value, subtotal)
      }

      return {
        valid: true,
        discount: disc,
        calculatedAmount: calculatedDiscount,
      }
    }
  },
}
