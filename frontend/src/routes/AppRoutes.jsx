import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Layouts
import { AuthLayout } from '../layouts/AuthLayout'
import { AdminLayout } from '../layouts/AdminLayout'
import { StaffLayout } from '../layouts/StaffLayout'
import { CustomerLayout } from '../layouts/CustomerLayout'

// Auth Pages
import { Login } from '../pages/auth/Login'
import { Register } from '../pages/auth/Register'
import { ForgotPassword } from '../pages/auth/ForgotPassword'
import { ResetPassword } from '../pages/auth/ResetPassword'

// Admin Pages
import { AdminDashboard } from '../pages/admin/AdminDashboard'
import { AdminReports } from '../pages/admin/AdminReports'

// Shared / Modular Pages
import { CustomerList } from '../pages/customers/CustomerList'
import { ProductList } from '../pages/products/ProductList'
import { ProductForm } from '../pages/products/ProductForm'
import { PlanList } from '../pages/plans/PlanList'
import { QuotationList } from '../pages/quotations/QuotationList'
import { SubscriptionList } from '../pages/subscriptions/SubscriptionList'
import { InvoiceList } from '../pages/invoices/InvoiceList'
import { DiscountList } from '../pages/discounts/DiscountList'
import { PaymentList } from '../pages/payments/PaymentList'
import { Profile } from '../pages/common/Profile'

// Staff Dashboard
import { StaffDashboard } from '../pages/staff/StaffDashboard'

// Customer Portal Pages
import { CustomerDashboard } from '../pages/customer/CustomerDashboard'
import { CustomerSubscription } from '../pages/customer/CustomerSubscription'
import { CustomerInvoices } from '../pages/customer/CustomerInvoices'
import { CustomerPayments } from '../pages/customer/CustomerPayments'

// Fallback Pages
import { Unauthorized } from '../pages/common/Unauthorized'
import { NotFound } from '../pages/common/NotFound'

export function AppRoutes() {
  const { user, role, isAuthenticated } = useAuth()

  // Default redirect root based on current user role
  const getDefaultHome = () => {
    if (!isAuthenticated) return '/login'
    if (role === 'admin') return '/admin/dashboard'
    if (role === 'staff') return '/staff/dashboard'
    return '/customer/dashboard'
  }

  return (
    <Routes>
      {/* Root redirection */}
      <Route path="/" element={<Navigate to={getDefaultHome()} replace />} />

      {/* Authentication Routes (wrapped in AuthLayout) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      {/* Admin Protected Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="customers" element={<CustomerList />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/create" element={<ProductForm />} />
        <Route path="products/:id" element={<ProductForm />} />
        <Route path="plans" element={<PlanList />} />
        <Route path="quotations" element={<QuotationList />} />
        <Route path="subscriptions" element={<SubscriptionList />} />
        <Route path="invoices" element={<InvoiceList />} />
        <Route path="discounts" element={<DiscountList />} />
        <Route path="payments" element={<PaymentList />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Staff Protected Routes */}
      <Route path="/staff" element={<StaffLayout />}>
        <Route index element={<Navigate to="/staff/dashboard" replace />} />
        <Route path="dashboard" element={<StaffDashboard />} />
        <Route path="customers" element={<CustomerList />} />
        <Route path="quotations" element={<QuotationList />} />
        <Route path="subscriptions" element={<SubscriptionList />} />
        <Route path="invoices" element={<InvoiceList />} />
        <Route path="payments" element={<PaymentList />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Customer Portal Protected Routes */}
      <Route path="/customer" element={<CustomerLayout />}>
        <Route index element={<Navigate to="/customer/dashboard" replace />} />
        <Route path="dashboard" element={<CustomerDashboard />} />
        <Route path="subscription" element={<CustomerSubscription />} />
        <Route path="invoices" element={<CustomerInvoices />} />
        <Route path="payments" element={<CustomerPayments />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Unauthorized Access */}
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* 404 Catch All */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
