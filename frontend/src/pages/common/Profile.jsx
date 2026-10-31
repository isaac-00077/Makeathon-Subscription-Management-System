import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { User, Mail, Building, Phone, MapPin, Shield, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Input } from '../../components/common/Input'
import { Button } from '../../components/common/Button'
import { useAuth } from '../../context/AuthContext'
import { authService } from '../../services/authService'
import { useNotification } from '../../context/NotificationContext'

export function Profile() {
  const { user, updateUser, role } = useAuth()
  const { showSuccess, showError } = useNotification()
  const [isSaving, setIsSaving] = useState(false)

  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      company: user?.company || '',
      phone: user?.phone || '',
      address: user?.address || '',
    },
  })

  const onSubmit = async (data) => {
    setIsSaving(true)
    try {
      await authService.updateProfile({ id: user?.id, ...data })
      updateUser(data)
      showSuccess('Profile details updated successfully!')
    } catch (err) {
      showError(err.message || 'Failed to update profile.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Account Profile"
        description="Manage your account identity, organization parameters, and contact coordinates"
        breadcrumbs={[
          { label: 'Dashboard', href: `/${role}/dashboard` },
          { label: 'Profile' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-slate-900 text-white font-black text-2xl flex items-center justify-center overflow-hidden border-4 border-slate-100 shadow-md mb-4">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              (user?.name || 'U').charAt(0)
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-900">{user?.name}</h3>
          <p className="text-xs text-slate-500">{user?.email}</p>
          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 capitalize">
              <Shield className="w-3.5 h-3.5" />
              {role} Account
            </span>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 w-full text-left space-y-3 text-xs text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400">Account ID:</span>
              <span className="font-mono font-semibold text-slate-800">{user?.id || 'usr_demo'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Authentication:</span>
              <span className="text-slate-800 font-medium">JWT Secure Token</span>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
            Personal & Organization Details
          </h3>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                icon={User}
                {...register('name')}
              />
              <Input
                label="Email Address"
                icon={Mail}
                disabled
                helperText="Email is locked to primary authentication handle"
                {...register('email')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Company / Entity"
                icon={Building}
                placeholder="e.g. Acme Corporation"
                {...register('company')}
              />
              <Input
                label="Phone Number"
                icon={Phone}
                placeholder="e.g. +1 (555) 000-0000"
                {...register('phone')}
              />
            </div>

            <Input
              label="Billing Address"
              icon={MapPin}
              placeholder="e.g. 100 Main Street, Suite 400"
              {...register('address')}
            />

            <div className="pt-4 flex justify-end">
              <Button type="submit" variant="primary" isLoading={isSaving}>
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
