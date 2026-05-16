'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi, tokenStore } from '@/lib/api'
import { ROUTES, isAdminRole } from '@/lib/constants'
import type { User } from '@/types'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string, twoFactorToken?: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: (next?: User) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // The access token is rehydrated from the cookie by lib/api on first
    // import. If there's a token, fetch the user; the axios interceptor will
    // silently refresh once if it has expired. Skipping the eager refresh
    // matters because the backend rotates refresh tokens per use, so calling
    // refresh on every mount would burn the token saved by Playwright's
    // storageState and break subsequent tests.
    if (!tokenStore.getAccess()) {
      setIsLoading(false)
      return
    }
    authApi
      .getMe()
      .then(({ user }) => setUser(user))
      .catch(() => tokenStore.clear())
      .finally(() => setIsLoading(false))
  }, [])

  const login = async (email: string, password: string, twoFactorToken?: string) => {
    const { user, tokens } = await authApi.login(email, password, twoFactorToken)
    if (!isAdminRole(user.role))
      throw new Error('Access denied. This portal is for administrators only.')
    tokenStore.set(tokens.accessToken)
    setUser(user)
    router.push(ROUTES.dashboard)
  }

  const refreshUser = async (next?: User) => {
    if (next) {
      setUser(next)
      return
    }
    const { user: fresh } = await authApi.getMe()
    setUser(fresh)
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore
    } finally {
      tokenStore.clear()
      setUser(null)
      router.push(ROUTES.login)
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
