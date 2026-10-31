import apiClient from './api'
import { getMockStore, saveMockStore } from './mockData'

/**
 * Product & Variant Service (Person 1 Responsibility)
 * Endpoints:
 * - GET    /api/v1/products
 * - GET    /api/v1/products/:id
 * - POST   /api/v1/products
 * - PUT    /api/v1/products/:id
 * - DELETE /api/v1/products/:id
 * - POST   /api/v1/products/:id/variants
 * - PUT    /api/v1/products/:id/variants/:variantId
 * - DELETE /api/v1/products/:id/variants/:variantId
 */

export const productService = {
  async getProducts(params = {}) {
    try {
      const response = await apiClient.get('/api/v1/products', { params })
      return response.data
    } catch (err) {
      console.warn('Live API unavailable for getProducts. Using mock store fallback.')
      const store = getMockStore()
      let list = [...store.products]
      if (params.search) {
        const q = params.search.toLowerCase()
        list = list.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
        )
      }
      if (params.category && params.category !== 'all') {
        list = list.filter((p) => p.category.toLowerCase() === params.category.toLowerCase())
      }
      if (params.status && params.status !== 'all') {
        list = list.filter((p) => p.status === params.status)
      }
      return list
    }
  },

  async getProductById(id) {
    try {
      const response = await apiClient.get(`/api/v1/products/${id}`)
      return response.data
    } catch (err) {
      const store = getMockStore()
      const found = store.products.find((p) => p.id === id)
      if (!found) throw new Error('Product not found')
      return found
    }
  },

  async createProduct(data) {
    try {
      const response = await apiClient.post('/api/v1/products', data)
      return response.data
    } catch (err) {
      const store = getMockStore()
      const newProd = {
        id: `prod_${Date.now()}`,
        name: data.name,
        code: data.code || `PROD-${Date.now().toString().slice(-4)}`,
        sku: data.sku || `SKU-${Date.now().toString().slice(-4)}`,
        category: data.category || 'General',
        description: data.description || '',
        basePrice: parseFloat(data.basePrice) || 0,
        availability: data.availability || 'in_stock',
        status: data.status || 'active',
        variants: data.variants || [],
        createdAt: new Date().toISOString().split('T')[0],
      }
      store.products.unshift(newProd)
      saveMockStore(store)
      return newProd
    }
  },

  async updateProduct(id, updates) {
    try {
      const response = await apiClient.put(`/api/v1/products/${id}`, updates)
      return response.data
    } catch (err) {
      const store = getMockStore()
      const index = store.products.findIndex((p) => p.id === id)
      if (index === -1) throw new Error('Product not found')
      store.products[index] = {
        ...store.products[index],
        ...updates,
        basePrice: updates.basePrice !== undefined ? parseFloat(updates.basePrice) : store.products[index].basePrice,
      }
      saveMockStore(store)
      return store.products[index]
    }
  },

  async deleteProduct(id) {
    try {
      const response = await apiClient.delete(`/api/v1/products/${id}`)
      return response.data
    } catch (err) {
      const store = getMockStore()
      store.products = store.products.filter((p) => p.id !== id)
      saveMockStore(store)
      return { success: true, message: 'Product deleted' }
    }
  },

  async archiveProduct(id) {
    return this.updateProduct(id, { status: 'archived' })
  },
}
