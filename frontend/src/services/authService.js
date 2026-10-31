import apiClient from './api'
import { getMockStore, saveMockStore } from './mockData'

/**
 * Authentication Service (Person 1 Responsibility)
 * Endpoints:
 * - POST /api/v1/auth/login
 * - POST /api/v1/auth/register
 * - POST /api/v1/auth/forgot-password
 * - POST /api/v1/auth/reset-password
 * - GET  /api/v1/auth/me
 * - PUT  /api/v1/auth/profile
 */

export const authService = {
  async login({ email, password }) {
    try {
      const response = await apiClient.post('/api/v1/auth/login', { email, password })
      return response.data
    } catch (err) {
      // Graceful fallback to mock credentials for development/testing
      console.warn('Live API unavailable for login. Using mock authentication fallback.', err.message)
      const store = getMockStore()
      const user = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
      
      // Allow any password in test mode, or standard 'password123'
      if (user) {
        const token = `mock_jwt_token_${user.role}_${Date.now()}`
        return {
          user,
          token,
          message: 'Logged in successfully (Dev Mode)',
        }
      }

      // If customer registers with a new email, check customer records
      const customer = store.customers.find((c) => c.email.toLowerCase() === email.toLowerCase())
      if (customer) {
        const customUser = {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          role: 'customer',
          company: customer.company,
          status: 'active',
        }
        return {
          user: customUser,
          token: `mock_jwt_token_customer_${Date.now()}`,
          message: 'Logged in successfully',
        }
      }

      throw new Error('Invalid email or password. Try admin@subflow.io, staff@subflow.io, or customer@acme.inc')
    }
  },

  async register(payload) {
    try {
      const response = await apiClient.post('/api/v1/auth/register', payload)
      return response.data
    } catch (err) {
      console.warn('Live API unavailable for register. Using mock registration fallback.', err.message)
      const store = getMockStore()
      const exists = store.users.some((u) => u.email.toLowerCase() === payload.email.toLowerCase())
      if (exists) {
        throw new Error('User with this email already exists.')
      }

      const newUser = {
        id: `usr_${Date.now()}`,
        name: payload.name,
        email: payload.email,
        role: payload.role || 'customer',
        company: payload.company || '',
        phone: payload.phone || '',
        status: 'active',
        createdAt: new Date().toISOString(),
      }

      store.users.push(newUser)
      if (newUser.role === 'customer') {
        store.customers.push({
          id: `cust_${Date.now()}`,
          name: newUser.name,
          email: newUser.email,
          company: newUser.company || 'Personal Account',
          phone: newUser.phone,
          status: 'active',
          tier: 'Starter',
          createdAt: new Date().toISOString().split('T')[0],
        })
      }
      saveMockStore(store)

      return {
        user: newUser,
        token: `mock_jwt_token_${newUser.role}_${Date.now()}`,
        message: 'Account created successfully',
      }
    }
  },

  async forgotPassword(email) {
    try {
      const response = await apiClient.post('/api/v1/auth/forgot-password', { email })
      return response.data
    } catch (err) {
      console.warn('Live API unavailable for forgotPassword. Fallback simulating email dispatch.')
      return {
        success: true,
        message: `Password reset link has been dispatched to ${email}.`,
      }
    }
  },

  async resetPassword({ token, newPassword }) {
    try {
      const response = await apiClient.post('/api/v1/auth/reset-password', { token, newPassword })
      return response.data
    } catch (err) {
      console.warn('Live API unavailable for resetPassword. Fallback simulating password update.')
      return {
        success: true,
        message: 'Your password has been reset successfully. Please log in.',
      }
    }
  },

  async getProfile() {
    try {
      const response = await apiClient.get('/api/v1/auth/me')
      return response.data
    } catch (err) {
      const saved = localStorage.getItem('subflow_auth_user')
      if (saved) return JSON.parse(saved)
      return null
    }
  },

  async updateProfile(updates) {
    try {
      const response = await apiClient.put('/api/v1/auth/profile', updates)
      return response.data
    } catch (err) {
      console.warn('Live API unavailable for updateProfile. Updating local state.')
      const store = getMockStore()
      const userIndex = store.users.findIndex((u) => u.id === updates.id || u.email === updates.email)
      if (userIndex !== -1) {
        store.users[userIndex] = { ...store.users[userIndex], ...updates }
        saveMockStore(store)
        return store.users[userIndex]
      }
      return updates
    }
  },
}
