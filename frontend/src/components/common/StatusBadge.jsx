import React from 'react'
import { cn } from '../../utils/cn'

export function StatusBadge({ status, className }) {
  if (!status) return null

  const s = String(status).toLowerCase().trim()

  const configMap = {
    // Green / Active / Success
    active: { label: 'Active', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    paid: { label: 'Paid', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    approved: { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    converted: { label: 'Converted', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    success: { label: 'Success', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    in_stock: { label: 'In Stock', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },

    // Blue / Sent / Processing / Info
    sent: { label: 'Sent', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    processing: { label: 'Processing', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },

    // Yellow / Amber / Paused / Pending
    pending: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    paused: { label: 'Paused', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    partially_paid: { label: 'Partially Paid', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    draft: { label: 'Draft', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },

    // Red / Rose / Overdue / Rejected / Failed / Closed
    overdue: { label: 'Overdue', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    rejected: { label: 'Rejected', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    failed: { label: 'Failed', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    closed: { label: 'Closed', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    cancelled: { label: 'Cancelled', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    out_of_stock: { label: 'Out of Stock', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },

    // Slate / Inactive / Expired / Archived
    inactive: { label: 'Inactive', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
    expired: { label: 'Expired', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
    archived: { label: 'Archived', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
    refunded: { label: 'Refunded', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  }

  const config = configMap[s] || {
    label: s.replace(/_/g, ' '),
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize tracking-wide',
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', config.text.replace('text-', 'bg-'))} />
      {config.label}
    </span>
  )
}
