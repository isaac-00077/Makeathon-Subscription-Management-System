import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Package, Edit, Trash2, Archive, Search, Tag, Check, Layers } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/common/Button'
import { SearchBar } from '../../components/common/SearchBar'
import { StatusBadge } from '../../components/common/StatusBadge'
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { EmptyState } from '../../components/common/EmptyState'
import { productService } from '../../services/productService'
import { useNotification } from '../../context/NotificationContext'
import { formatCurrency } from '../../utils/formatters'

export function ProductList() {
  const { showSuccess, showError } = useNotification()
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleteProduct, setDeleteProduct] = useState(null)
  const [archiveProduct, setArchiveProduct] = useState(null)

  const loadProducts = async () => {
    try {
      setIsLoading(true)
      const data = await productService.getProducts({
        search,
        category: categoryFilter,
        status: statusFilter,
      })
      setProducts(data)
    } catch (err) {
      showError(err.message || 'Failed to load products.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [search, categoryFilter, statusFilter])

  const handleDelete = async () => {
    if (!deleteProduct) return
    try {
      await productService.deleteProduct(deleteProduct.id)
      showSuccess('Product removed from catalog.')
      setDeleteProduct(null)
      loadProducts()
    } catch (err) {
      showError(err.message || 'Failed to delete product.')
    }
  }

  const handleArchive = async () => {
    if (!archiveProduct) return
    try {
      await productService.archiveProduct(archiveProduct.id)
      showSuccess('Product archived successfully.')
      setArchiveProduct(null)
      loadProducts()
    } catch (err) {
      showError(err.message || 'Failed to archive product.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products & Variants"
        description="Catalog of billable platform services, hardware items, add-on modules, and variant pricing"
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Products' },
        ]}
        actions={
          <Link to="/admin/products/create">
            <Button variant="primary" size="sm" icon={Plus}>
              Create Product
            </Button>
          </Link>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search products by title or SKU..."
        />
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs font-semibold rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 shadow-sm"
          >
            <option value="all">All Categories</option>
            <option value="software">Software</option>
            <option value="security">Security</option>
            <option value="analytics">Analytics</option>
            <option value="services">Services</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 shadow-sm"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      {isLoading ? (
        <LoadingSpinner message="Loading catalog items..." />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products found"
          description="Build your product catalog to start generating subscription plans and quotations."
          actionLabel="Create Product"
          onAction={() => window.location.href = '/admin/products/create'}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Product Name & SKU</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Base Price</th>
                  <th className="px-6 py-4">Variants Configured</th>
                  <th className="px-6 py-4">Availability</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{prod.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">{prod.sku} • {prod.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                        {prod.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {formatCurrency(prod.basePrice)}
                    </td>
                    <td className="px-6 py-4">
                      {prod.variants && prod.variants.length > 0 ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            <Layers className="w-3 h-3" />
                            {prod.variants.length} variant{prod.variants.length > 1 ? 's' : ''}
                          </span>
                          <p className="text-[11px] text-slate-500 truncate max-w-xs">
                            {prod.variants.map((v) => `${v.name} (+${formatCurrency(v.additionalPrice)})`).join(', ')}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400">Standard single SKU</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={prod.availability} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={prod.status} />
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <Link to={`/admin/products/${prod.id}`}>
                        <button
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition"
                          title="Edit Product & Variants"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </Link>
                      <button
                        onClick={() => setArchiveProduct(prod)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                        title="Archive Product"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteProduct(prod)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      <ConfirmationDialog
        isOpen={!!archiveProduct}
        onClose={() => setArchiveProduct(null)}
        onConfirm={handleArchive}
        title="Archive Product"
        message={`Archive "${archiveProduct?.name}"? Archived items won't be available in new quotation line item selectors.`}
        confirmText="Archive"
        variant="primary"
      />

      {/* Delete Modal */}
      <ConfirmationDialog
        isOpen={!!deleteProduct}
        onClose={() => setDeleteProduct(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Are you sure you want to completely delete "${deleteProduct?.name}" from the system catalog?`}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  )
}
