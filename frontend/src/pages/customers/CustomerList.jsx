import React, { useState, useEffect } from 'react'
import { Plus, Users, Mail, Phone, Building, Edit, Trash2, Search, ExternalLink } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Select } from '../../components/common/Select'
import { SearchBar } from '../../components/common/SearchBar'
import { StatusBadge } from '../../components/common/StatusBadge'
import { Modal } from '../../components/common/Modal'
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { EmptyState } from '../../components/common/EmptyState'
import { userService } from '../../services/userService'
import { useNotification } from '../../context/NotificationContext'
import { useAuth } from '../../context/AuthContext'
import { formatDate } from '../../utils/formatters'

export function CustomerList() {
  const { role } = useAuth()
  const { showSuccess, showError } = useNotification()
  const [customers, setCustomers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [deleteConfirmCust, setDeleteConfirmCust] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, reset, setValue } = useForm()

  const loadCustomers = async () => {
    try {
      setIsLoading(true)
      const data = await userService.getCustomers({ search, status: statusFilter === 'all' ? null : statusFilter })
      setCustomers(data)
    } catch (err) {
      showError(err.message || 'Failed to load customers.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [search, statusFilter])

  const openCreateModal = () => {
    setEditingCustomer(null)
    reset({
      name: '',
      email: '',
      company: '',
      phone: '',
      address: '',
      tier: 'Starter',
      status: 'active',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (cust) => {
    setEditingCustomer(cust)
    reset({
      name: cust.name,
      email: cust.email,
      company: cust.company || '',
      phone: cust.phone || '',
      address: cust.address || '',
      tier: cust.tier || 'Starter',
      status: cust.status || 'active',
    })
    setIsModalOpen(true)
  }

  const onSubmit = async (formData) => {
    setIsSubmitting(true)
    try {
      if (editingCustomer) {
        await userService.updateCustomer(editingCustomer.id, formData)
        showSuccess('Customer details updated successfully!')
      } else {
        await userService.createCustomer(formData)
        showSuccess('New customer profile added!')
      }
      setIsModalOpen(false)
      loadCustomers()
    } catch (err) {
      showError(err.message || 'Error saving customer.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirmCust) return
    try {
      await userService.deleteCustomer(deleteConfirmCust.id)
      showSuccess('Customer record deleted successfully.')
      setDeleteConfirmCust(null)
      loadCustomers()
    } catch (err) {
      showError(err.message || 'Failed to delete customer.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Directory"
        description="Comprehensive client accounts, subscription contracts, and contact profiles"
        breadcrumbs={[
          { label: 'Dashboard', href: `/${role}/dashboard` },
          { label: 'Customers' },
        ]}
        actions={
          <Button variant="primary" size="sm" icon={Plus} onClick={openCreateModal}>
            Add Customer
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email, or company..."
        />
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 shadow-sm w-full sm:w-auto"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Accounts</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      {isLoading ? (
        <LoadingSpinner message="Fetching customer records..." />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers found"
          description="Create your first client account to begin issuing quotations and managing subscriptions."
          actionLabel="Add Customer"
          onAction={openCreateModal}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Tier</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Registered</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0">
                          {cust.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{cust.name}</p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {cust.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">
                      {cust.company || '—'}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {cust.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {cust.phone}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {cust.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={cust.status} />
                    </td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(cust.createdAt)}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(cust)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition"
                        title="Edit Customer"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmCust(cust)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Delete Customer"
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

      {/* Customer Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Edit Customer Details' : 'Create New Customer Account'}
        description="Provide client organization details and billing contact information."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="e.g. David Kim"
            required
            {...register('name', { required: true })}
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. dkim@nexushealth.org"
            required
            {...register('email', { required: true })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Company Name"
              placeholder="e.g. Nexus Health Solutions"
              {...register('company')}
            />
            <Input
              label="Phone Number"
              placeholder="e.g. +1 (555) 000-0000"
              {...register('phone')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Customer Tier" {...register('tier')}>
              <option value="Starter">Starter Tier</option>
              <option value="Professional">Professional Tier</option>
              <option value="Enterprise">Enterprise Tier</option>
            </Select>

            <Select label="Account Status" {...register('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>

          <Input
            label="Billing Address"
            placeholder="e.g. 450 Medical Plaza, Chicago, IL"
            {...register('address')}
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingCustomer ? 'Save Changes' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteConfirmCust}
        onClose={() => setDeleteConfirmCust(null)}
        onConfirm={handleDelete}
        title="Delete Customer Account"
        message={`Are you sure you want to delete "${deleteConfirmCust?.name}"? All associated historical quotations and subscriptions will be preserved in archived records.`}
        confirmText="Delete Account"
      />
    </div>
  )
}
