import React from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '../../utils/cn'

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search records...',
  className,
  onClear,
}) {
  return (
    <div className={cn('relative w-full max-w-sm', className)}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
        <Search className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full pl-9 pr-9 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            if (onClear) onClear()
            else onChange('')
          }}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
