import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback(({ message, type = 'info', title, duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9)
    const newToast = { id, message, type, title }
    
    setToasts((prev) => [...prev, newToast])

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    }
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showSuccess = useCallback((message, title = 'Success') => {
    addToast({ message, title, type: 'success' })
  }, [addToast])

  const showError = useCallback((message, title = 'Error') => {
    addToast({ message, title, type: 'error' })
  }, [addToast])

  const showInfo = useCallback((message, title = 'Information') => {
    addToast({ message, title, type: 'info' })
  }, [addToast])

  const showWarning = useCallback((message, title = 'Warning') => {
    addToast({ message, title, type: 'warning' })
  }, [addToast])

  return (
    <NotificationContext.Provider
      value={{ addToast, removeToast, showSuccess, showError, showInfo, showWarning }}
    >
      {children}

      {/* Toast container floating bottom-right */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          let bg = 'bg-white border-slate-200 text-slate-800'
          let Icon = Info
          let iconColor = 'text-blue-500'

          if (toast.type === 'success') {
            bg = 'bg-emerald-50 border-emerald-200 text-emerald-950'
            Icon = CheckCircle2
            iconColor = 'text-emerald-600'
          } else if (toast.type === 'error') {
            bg = 'bg-rose-50 border-rose-200 text-rose-950'
            Icon = AlertCircle
            iconColor = 'text-rose-600'
          } else if (toast.type === 'warning') {
            bg = 'bg-amber-50 border-amber-200 text-amber-950'
            Icon = AlertTriangle
            iconColor = 'text-amber-600'
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all animate-in fade-in slide-in-from-bottom-3 ${bg}`}
              role="alert"
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                {toast.title && <h4 className="text-sm font-semibold mb-0.5">{toast.title}</h4>}
                <p className="text-xs sm:text-sm opacity-90 leading-relaxed break-words">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}
