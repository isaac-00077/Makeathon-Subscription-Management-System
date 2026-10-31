import React, { forwardRef } from 'react'
import { cn } from '../../utils/cn'

export const Input = forwardRef(
  ({ label, error, helperText, icon: Icon, className, id, ...props }, ref) => {
    const inputId = id || props.name || Math.random().toString(36).substring(2, 9)

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 mb-1.5">
            {label}
            {props.required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative rounded-lg shadow-sm">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400',
              'transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
              'disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200',
              Icon ? 'pl-9' : 'pl-3',
              error && 'border-rose-300 focus:border-rose-500 focus:ring-rose-500',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
