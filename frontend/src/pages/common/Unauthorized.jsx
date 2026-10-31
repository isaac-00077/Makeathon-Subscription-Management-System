import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { Button } from '../../components/common/Button'
import { useAuth } from '../../context/AuthContext'

export function Unauthorized() {
  const { role } = useAuth()
  const homePath = role ? `/${role}/dashboard` : '/login'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 text-center">
      <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mb-6">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-white mb-2">Access Restricted</h1>
      <p className="text-slate-400 max-w-md text-sm leading-relaxed mb-8">
        You do not possess the required permission tier to access this module. Please switch to an authorized role or return to your designated portal.
      </p>
      <div className="flex gap-4">
        <Link to={homePath}>
          <Button variant="primary" icon={ArrowLeft}>
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
