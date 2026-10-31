import React from 'react'
import { Link } from 'react-router-dom'
import { FileQuestion, ArrowLeft } from 'lucide-react'
import { Button } from '../../components/common/Button'
import { useAuth } from '../../context/AuthContext'

export function NotFound() {
  const { role } = useAuth()
  const homePath = role ? `/${role}/dashboard` : '/login'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
      <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
        <FileQuestion className="w-8 h-8" />
      </div>
      <span className="text-sm font-bold uppercase tracking-wider text-blue-600 mb-1">404 Error</span>
      <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Page Not Found</h1>
      <p className="text-slate-500 max-w-md text-sm leading-relaxed mb-8">
        The resource or view you requested does not exist or has been relocated to another workspace route.
      </p>
      <Link to={homePath}>
        <Button variant="primary" icon={ArrowLeft}>
          Return Home
        </Button>
      </Link>
    </div>
  )
}
