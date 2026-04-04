'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { authApi, tokenStore } from '@/lib/api'
import type { User, RegisterData } from '@/types'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = tokenStore.getAccess()
    if (!token) {
      tokenStore.clear() // remove any stale cookie so proxy doesn't block routes
      setIsLoading(false)
      return
    }
    authApi
      .getMe()
      .then(({ user }) => setUser(user))
      .catch(() => tokenStore.clear())
      .finally(() => setIsLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const { user, tokens } = await authApi.login(email, password)
    if (!['admin', 'super_admin'].includes(user.role)) throw new Error('Access denied. This portal is for administrators only.')
    tokenStore.set(tokens.accessToken)
    setUser(user)
    window.location.href = '/admin/dashboard'
  }

  const register = async (data: RegisterData) => {
    const { user, tokens } = await authApi.register(data)
    if (!['admin', 'super_admin'].includes(user.role)) throw new Error('Access denied. This portal is for administrators only.')
    tokenStore.set(tokens.accessToken)
    setUser(user)
    window.location.href = '/admin/dashboard'
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore
    } finally {
      tokenStore.clear()
      setUser(null)
      window.location.href = '/login'
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
