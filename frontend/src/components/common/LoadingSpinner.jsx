import React from 'react'
import { Loader2 } from 'lucide-react'

export function LoadingSpinner({ size = 'md', message = 'Loading data...', className = '' }) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <Loader2 className={`${sizeMap[size] || sizeMap.md} animate-spin text-blue-600 mb-3`} />
      {message && <p className="text-sm font-medium text-slate-500">{message}</p>}
    </div>
  )
}
