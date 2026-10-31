import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { DashboardLayout } from './DashboardLayout'
import { LoadingSpinner } from '../components/common/LoadingSpinner'

export function CustomerLayout() {
  const { user, role, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner message="Loading customer portal..." />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // All logged in users can view the customer portal, but default to customer
  return <DashboardLayout />
}
