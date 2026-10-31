import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { DashboardLayout } from './DashboardLayout'
import { LoadingSpinner } from '../components/common/LoadingSpinner'

export function AdminLayout() {
  const { user, role, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner message="Verifying administrative credentials..." />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (role !== 'admin') {
    return <Navigate to="/unauthorized" replace />
  }

  return <DashboardLayout />
}
