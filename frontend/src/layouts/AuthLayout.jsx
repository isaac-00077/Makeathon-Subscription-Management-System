import React from 'react'
import { Outlet, Link } from 'react-router-dom'
import { ShieldCheck, CheckCircle2, Zap } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-900 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-600/20 via-indigo-600/10 to-transparent blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <Link to="/login" className="inline-flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/30">
            S
          </div>
          <span className="text-2xl font-black tracking-tight text-white">SubFlow</span>
        </Link>
        <p className="mt-2 text-xs uppercase tracking-widest text-slate-400 font-semibold">
          Commercial Subscription Management Platform
        </p>
      </div>

      {/* Auth Content Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0 z-10">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-3xl border border-slate-100 sm:px-10">
          <Outlet />
        </div>

        {/* Security and Trust Badges */}
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            256-Bit SSL Encrypted
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-blue-400" />
            FastAPI Backend
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
            Razorpay Ready
          </span>
        </div>
      </div>
    </div>
  )
}
