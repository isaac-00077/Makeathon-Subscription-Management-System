import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, KeyRound, Eye, EyeOff } from 'lucide-react'
import { Input } from '../../components/common/Input'
import { Button } from '../../components/common/Button'
import { authService } from '../../services/authService'
import { useNotification } from '../../context/NotificationContext'

const schema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export function ResetPassword() {
  const { showSuccess, showError } = useNotification()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      token: 'DEMO-RESET-TOKEN-2026',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data) => {
    setIsSubmitting(true)
    try {
      await authService.resetPassword(data)
      showSuccess('Your password has been reset successfully! Please sign in.')
      navigate('/login')
    } catch (err) {
      showError(err.message || 'Password reset failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Set New Password</h2>
        <p className="text-xs text-slate-500 mt-1">
          Provide your verification token and select a new secure password
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Reset Token"
          icon={KeyRound}
          placeholder="Paste verification token"
          error={errors.token?.message}
          {...register('token')}
        />

        <div className="relative">
          <Input
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            icon={Lock}
            placeholder="••••••••"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <Input
          label="Confirm New Password"
          type={showPassword ? 'text' : 'password'}
          icon={Lock}
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-2"
          isLoading={isSubmitting}
        >
          Reset Password
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link to="/login" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
          Return to Sign In
        </Link>
      </div>
    </div>
  )
}
