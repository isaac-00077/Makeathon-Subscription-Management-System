import apiClient from './api'
import { getMockStore, saveMockStore } from './mockData'

/**
 * User & Customer Service (Person 1 Responsibility)
 * Endpoints:
 * - GET  /api/v1/users
 * - GET  /api/v1/customers
 * - POST /api/v1/customers
 * - GET  /api/v1/customers/:id
 * - PUT  /api/v1/customers/:id
 * - DELETE /api/v1/customers/:id
 */

export const userService = {
  async getCustomers(params = {}) {
    try {
      const response = await apiClient.get('/api/v1/customers', { params })
      return response.data
    } catch (err) {
      console.warn('Live API unavailable for getCustomers. Using mock store fallback.')
      const store = getMockStore()
      let list = [...store.customers]
      if (params.search) {
        const q = params.search.toLowerCase()
        list = list.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            (c.company && c.company.toLowerCase().includes(q))
        )
      }
      if (params.status) {
        list = list.filter((c) => c.status === params.status)
      }
      return list
    }
  },

  async getCustomerById(id) {
    try {
      const response = await apiClient.get(`/api/v1/customers/${id}`)
      return response.data
    } catch (err) {
      const store = getMockStore()
      const found = store.customers.find((c) => c.id === id)
      if (!found) throw new Error('Customer not found')
      return found
    }
  },

  async createCustomer(data) {
    try {
      const response = await apiClient.post('/api/v1/customers', data)
      return response.data
    } catch (err) {
      const store = getMockStore()
      const newCust = {
        id: `cust_${Date.now()}`,
        name: data.name,
        email: data.email,
        company: data.company || '',
        phone: data.phone || '',
        address: data.address || '',
        tier: data.tier || 'Starter',
        status: data.status || 'active',
        createdAt: new Date().toISOString().split('T')[0],
      }
      store.customers.unshift(newCust)
      saveMockStore(store)
      return newCust
    }
  },

  async updateCustomer(id, updates) {
    try {
      const response = await apiClient.put(`/api/v1/customers/${id}`, updates)
      return response.data
    } catch (err) {
      const store = getMockStore()
      const index = store.customers.findIndex((c) => c.id === id)
      if (index === -1) throw new Error('Customer not found')
      store.customers[index] = { ...store.customers[index], ...updates }
      saveMockStore(store)
      return store.customers[index]
    }
  },

  async deleteCustomer(id) {
    try {
      const response = await apiClient.delete(`/api/v1/customers/${id}`)
      return response.data
    } catch (err) {
      const store = getMockStore()
      store.customers = store.customers.filter((c) => c.id !== id)
      saveMockStore(store)
      return { success: true, message: 'Customer removed' }
    }
  },
}
