import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Package,
  Layers,
  FileText,
  Repeat,
  Receipt,
  Percent,
  CreditCard,
  BarChart3,
  User,
  LogOut,
  X,
  Shield,
  Briefcase,
  UserCircle,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../utils/cn'

export function Sidebar({ isOpen, onClose }) {
  const { user, role, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Navigation sets based on role
  const navMap = {
    admin: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/admin/customers', label: 'Customers', icon: Users },
      { to: '/admin/products', label: 'Products & Variants', icon: Package },
      { to: '/admin/plans', label: 'Subscription Plans', icon: Layers },
      { to: '/admin/quotations', label: 'Quotations', icon: FileText },
      { to: '/admin/subscriptions', label: 'Subscriptions', icon: Repeat },
      { to: '/admin/invoices', label: 'Invoices', icon: Receipt },
      { to: '/admin/discounts', label: 'Discounts', icon: Percent },
      { to: '/admin/payments', label: 'Payments', icon: CreditCard },
      { to: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3 },
      { to: '/admin/profile', label: 'Admin Profile', icon: User },
    ],
    staff: [
      { to: '/staff/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/staff/customers', label: 'Customers', icon: Users },
      { to: '/staff/quotations', label: 'Quotations', icon: FileText },
      { to: '/staff/subscriptions', label: 'Subscriptions', icon: Repeat },
      { to: '/staff/invoices', label: 'Invoices', icon: Receipt },
      { to: '/staff/payments', label: 'Payments', icon: CreditCard },
      { to: '/staff/profile', label: 'Staff Profile', icon: User },
    ],
    customer: [
      { to: '/customer/dashboard', label: 'Portal Overview', icon: LayoutDashboard },
      { to: '/customer/subscription', label: 'My Subscription', icon: Repeat },
      { to: '/customer/invoices', label: 'Invoices & Billing', icon: Receipt },
      { to: '/customer/payments', label: 'Payment History', icon: CreditCard },
      { to: '/customer/profile', label: 'Account Profile', icon: User },
    ],
  }

  const items = navMap[role] || navMap.customer

  const roleBadge = {
    admin: { label: 'Administrator', icon: Shield, bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
    staff: { label: 'Staff Member', icon: Briefcase, bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    customer: { label: 'Customer', icon: UserCircle, bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  }[role || 'customer']

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-slate-950 text-slate-300 border-r border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand / Logo */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">
              S
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight">SubFlow</span>
              <span className="text-[10px] text-slate-400 block -mt-1 font-mono uppercase tracking-wider">Enterprise</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Identity Banner */}
        <div className="px-4 py-3 mx-3 my-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sm text-white overflow-hidden border border-slate-700">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              (user?.name || 'U').charAt(0)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            {roleBadge && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 mt-1 rounded-full border font-medium',
                  roleBadge.bg
                )}
              >
                <roleBadge.icon className="w-3 h-3" />
                {roleBadge.label}
              </span>
            )}
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => {
                if (window.innerWidth < 1024) onClose()
              }}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                )
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom Logout */}
        <div className="p-3 border-t border-slate-800/80">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
