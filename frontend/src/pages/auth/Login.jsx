import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Eye, EyeOff, Shield, Briefcase, UserCheck } from 'lucide-react'
import { Input } from '../../components/common/Input'
import { Button } from '../../components/common/Button'
import { useAuth } from '../../context/AuthContext'
import { useNotification } from '../../context/NotificationContext'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export function Login() {
  const { login } = useAuth()
  const { showSuccess, showError } = useNotification()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // Quick credentials filler for instant role testing
  const setDemoRole = (role) => {
    if (role === 'admin') {
      setValue('email', 'admin@subflow.io')
      setValue('password', 'password123')
    } else if (role === 'staff') {
      setValue('email', 'staff@subflow.io')
      setValue('password', 'password123')
    } else if (role === 'customer') {
      setValue('email', 'customer@acme.inc')
      setValue('password', 'password123')
    }
  }

  const onSubmit = async (data) => {
    setIsSubmitting(true)
    try {
      const result = await login(data)
      showSuccess(`Welcome back, ${result.user.name}!`)

      // Redirect according to role
      const role = result.user.role
      if (role === 'admin') navigate('/admin/dashboard')
      else if (role === 'staff') navigate('/staff/dashboard')
      else navigate('/customer/dashboard')
    } catch (err) {
      showError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Sign In to SubFlow</h2>
        <p className="text-xs text-slate-500 mt-1">
          Access your administrative or customer subscription portal
        </p>
      </div>

      {/* Quick Demo Role Selection Pills */}
      <div className="mb-6 p-3 rounded-xl bg-slate-50 border border-slate-200">
        <p className="text-[11px] font-semibold text-slate-600 mb-2 text-center uppercase tracking-wider">
          Quick Demo Login (1-Click Fill)
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setDemoRole('admin')}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition group"
          >
            <Shield className="w-4 h-4 text-indigo-600 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold text-slate-800">Admin</span>
          </button>
          <button
            type="button"
            onClick={() => setDemoRole('staff')}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition group"
          >
            <Briefcase className="w-4 h-4 text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold text-slate-800">Staff</span>
          </button>
          <button
            type="button"
            onClick={() => setDemoRole('customer')}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition group"
          >
            <UserCheck className="w-4 h-4 text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold text-slate-800">Customer</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Input
            label="Email Address"
            type="email"
            icon={Mail}
            placeholder="e.g. admin@subflow.io"
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            icon={Lock}
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
            <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <span>Remember me</span>
          </label>
          <Link to="/forgot-password" className="font-semibold text-blue-600 hover:text-blue-700">
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-2"
          isLoading={isSubmitting}
        >
          Sign In
        </Button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-500">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700">
          Create account
        </Link>
      </div>
    </div>
  )
}
