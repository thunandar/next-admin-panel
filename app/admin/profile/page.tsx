'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Shield, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { usersApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { formatDate, getApiErrorMessage } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

const schema = z
  .object({
    current: z.string().min(1, 'Current password is required'),
    newPass: z.string().min(6, 'New password must be at least 6 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.newPass === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })
  .refine((d) => d.current !== d.newPass, { message: 'New password must be different', path: ['newPass'] })

type FormData = z.infer<typeof schema>

export default function ProfilePage() {
  const { user } = useAuth()
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
  })

  const onSubmit = async (data: FormData) => {
    try {
      await usersApi.changePassword(data.current, data.newPass)
      toast.success('Password changed successfully')
      reset()
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to change password'))
    }
  }

  const toggle = (key: 'current' | 'new' | 'confirm') =>
    setShowPass((prev) => ({ ...prev, [key]: !prev[key] }))

  if (!user) return null

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Profile Card */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-gray-500 text-sm">{user.email}</p>
            <div className="flex items-center gap-1.5 mt-2">
              {user.role === 'admin' ? (
                <Shield size={14} className="text-purple-500" />
              ) : (
                <UserCheck size={14} className="text-blue-500" />
              )}
              <Badge variant={user.role === 'admin' ? 'purple' : 'blue'} className="capitalize">
                {user.role}
              </Badge>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Member since</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(user.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">User ID</p>
            <p className="text-sm font-medium text-gray-900">#{user.id}</p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-5">Change Password</h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Current password */}
          <div className="flex flex-col gap-1">
            <label htmlFor="current" className="text-sm font-medium text-gray-700">Current Password</label>
            <div className="relative">
              <input
                id="current"
                type={showPass.current ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('current')}
                className={`w-full px-3 py-2 pr-10 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.current ? 'border-red-400' : 'border-gray-300'}`}
              />
              <button type="button" aria-label={showPass.current ? 'Hide password' : 'Show password'} aria-pressed={showPass.current} onClick={() => toggle('current')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass.current ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.current && <p className="text-xs text-red-600">{errors.current.message}</p>}
          </div>

          {/* New password */}
          <div className="flex flex-col gap-1">
            <label htmlFor="newPass" className="text-sm font-medium text-gray-700">New Password</label>
            <div className="relative">
              <input
                id="newPass"
                type={showPass.new ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                {...register('newPass')}
                className={`w-full px-3 py-2 pr-10 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.newPass ? 'border-red-400' : 'border-gray-300'}`}
              />
              <button type="button" aria-label={showPass.new ? 'Hide password' : 'Show password'} aria-pressed={showPass.new} onClick={() => toggle('new')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass.new ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.newPass && <p className="text-xs text-red-600">{errors.newPass.message}</p>}
          </div>

          {/* Confirm password */}
          <div className="flex flex-col gap-1">
            <label htmlFor="confirm" className="text-sm font-medium text-gray-700">Confirm New Password</label>
            <div className="relative">
              <input
                id="confirm"
                type={showPass.confirm ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                {...register('confirm')}
                className={`w-full px-3 py-2 pr-10 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.confirm ? 'border-red-400' : 'border-gray-300'}`}
              />
              <button type="button" aria-label={showPass.confirm ? 'Hide password' : 'Show password'} aria-pressed={showPass.confirm} onClick={() => toggle('confirm')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirm && <p className="text-xs text-red-600">{errors.confirm.message}</p>}
          </div>

          <Button type="submit" loading={isSubmitting} className="w-full">
            Update Password
          </Button>
        </form>
      </div>
    </div>
  )
}
