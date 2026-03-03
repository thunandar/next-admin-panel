'use client'

import { useState } from 'react'
import { Eye, EyeOff, Shield, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { usersApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { formatDate } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'

export default function ProfilePage() {
  const { user } = useAuth()
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' })
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.current) e.current = 'Current password is required'
    if (!form.newPass || form.newPass.length < 6) e.newPass = 'New password must be at least 6 characters'
    if (form.newPass !== form.confirm) e.confirm = 'Passwords do not match'
    if (form.current === form.newPass) e.newPass = 'New password must be different'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      await usersApi.changePassword(form.current, form.newPass)
      toast.success('Password changed successfully')
      setForm({ current: '', newPass: '', confirm: '' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to change password'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  const toggle = (key: 'current' | 'new' | 'confirm') =>
    setShowPass((prev) => ({ ...prev, [key]: !prev[key] }))

  const PasswordField = ({
    label,
    field,
    toggleKey,
    value,
    error,
    autoComplete,
  }: {
    label: string
    field: 'current' | 'newPass' | 'confirm'
    toggleKey: 'current' | 'new' | 'confirm'
    value: string
    error?: string
    autoComplete: string
  }) => (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          type={showPass[toggleKey] ? 'text' : 'password'}
          value={value}
          onChange={(e) => setForm({ ...form, [field]: e.target.value })}
          placeholder="••••••••"
          autoComplete={autoComplete}
          className={`w-full px-3 py-2 pr-10 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        <button
          type="button"
          onClick={() => toggle(toggleKey)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {showPass[toggleKey] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )

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

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            label="Current Password"
            field="current"
            toggleKey="current"
            value={form.current}
            error={errors.current}
            autoComplete="current-password"
          />
          <PasswordField
            label="New Password"
            field="newPass"
            toggleKey="new"
            value={form.newPass}
            error={errors.newPass}
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm New Password"
            field="confirm"
            toggleKey="confirm"
            value={form.confirm}
            error={errors.confirm}
            autoComplete="new-password"
          />

          <Button type="submit" loading={loading} className="w-full">
            Update Password
          </Button>
        </form>
      </div>
    </div>
  )
}
