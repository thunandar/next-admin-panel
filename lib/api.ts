import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import type {
  AuthResponse,
  CreateProductData,
  PaginatedResponse,
  Product,
  ProductFilters,
  RegisterData,
  SingleResponse,
  UpdateProductData,
  User,
  UserFilters,
} from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// ─── Token Management ────────────────────────────────────────────────────────
// admin_access_token: stored in localStorage + non-HttpOnly cookie (proxy reads it)
// refresh_token: stored in HttpOnly cookie only (JS cannot access it)

export const tokenStore = {
  getAccess: () => (typeof window !== 'undefined' ? localStorage.getItem('admin_access_token') : null),
  set: (access: string) => {
    if (typeof window === 'undefined') return
    localStorage.setItem('admin_access_token', access)
    // 30 days matches the refresh token lifetime; resets on every silent refresh
    document.cookie = `admin_access_token=${access}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`
  },
  clear: () => {
    if (typeof window === 'undefined') return
    localStorage.removeItem('admin_access_token')
    document.cookie = 'admin_access_token=; path=/; max-age=0'
  },
}

// ─── Axios Instance (backend) ─────────────────────────────────────────────────

const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccess()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let queue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = []

const flushQueue = (err: unknown, token: string | null = null) => {
  queue.forEach(({ resolve, reject }) => (err ? reject(err) : resolve(token!)))
  queue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || original._retry) return Promise.reject(error)

    if (isRefreshing) {
      return new Promise((resolve, reject) => queue.push({ resolve, reject })).then((token) => {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      // Call the Next.js API route — it reads the HttpOnly refresh_token cookie
      const res = await axios.post('/api/auth/refresh')
      const { accessToken } = res.data.data
      tokenStore.set(accessToken)
      flushQueue(null, accessToken)
      original.headers.Authorization = `Bearer ${accessToken}`
      return api(original)
    } catch (err) {
      flushQueue(err)
      tokenStore.clear()
      // Clear the HttpOnly refresh_token cookie via the server route
      await axios.post('/api/auth/logout').catch(() => {})
      if (typeof window !== 'undefined') window.location.href = '/login'
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  },
)

// ─── Auth API ─────────────────────────────────────────────────────────────────
// login/register/logout go through Next.js API routes (set HttpOnly cookies)
// getMe goes directly to backend (uses access token in Authorization header)

export const authApi = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const res = await axios.post('/api/auth/register', data)
    const { user, accessToken } = res.data.data
    return { message: res.data.message, user, tokens: { accessToken } }
  },
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await axios.post('/api/auth/login', { email, password })
    const { user, accessToken } = res.data.data
    return { message: res.data.message, user, tokens: { accessToken } }
  },
  logout: async (): Promise<void> => {
    try { await api.post('/auth/logout') } catch { /* ignore if access token already expired */ }
    await axios.post('/api/auth/logout') // clears HttpOnly refresh_token cookie
  },
  getMe: async (): Promise<{ user: User }> => {
    const res = await api.get('/auth/me')
    return { user: res.data.data }
  },
}

// ─── Products API ─────────────────────────────────────────────────────────────

export const productsApi = {
  getAll: async (filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
    })
    const res = await api.get(`/products?${params}`)
    const { products, currentPage, totalPages, totalProducts } = res.data.data
    return {
      message: '',
      data: products,
      pagination: {
        currentPage,
        totalPages,
        totalItems: totalProducts,
        itemsPerPage: Number(filters.limit) || 10,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },
    }
  },

  getById: async (id: number): Promise<SingleResponse<Product>> => {
    const res = await api.get(`/products/${id}`)
    return { message: '', data: res.data.data }
  },

  search: async (term: string, page = 1, limit = 10): Promise<PaginatedResponse<Product>> => {
    const res = await api.get(`/products/search?search=${encodeURIComponent(term)}&page=${page}&limit=${limit}`)
    const { products, currentPage, totalPages, totalProducts } = res.data.data
    return {
      message: '',
      data: products,
      pagination: {
        currentPage,
        totalPages,
        totalItems: totalProducts,
        itemsPerPage: limit,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },
    }
  },

  create: async (data: CreateProductData, images?: File[]): Promise<SingleResponse<Product>> => {
    const form = new FormData()
    Object.entries(data).forEach(([k, v]) => { if (v !== undefined) form.append(k, String(v)) })
    images?.forEach((f) => form.append('images', f))
    return (await api.post('/products', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data
  },

  update: async (id: number, data: UpdateProductData, images?: File[]): Promise<SingleResponse<Product>> => {
    const form = new FormData()
    Object.entries(data).forEach(([k, v]) => { if (v !== undefined) form.append(k, String(v)) })
    images?.forEach((f) => form.append('images', f))
    return (await api.put(`/products/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } })).data
  },

  delete: async (id: number): Promise<void> => { await api.delete(`/products/${id}`) },
}

// ─── Users API ────────────────────────────────────────────────────────────────

export const usersApi = {
  getAll: async (filters: UserFilters = {}): Promise<PaginatedResponse<User>> => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, String(v))
    })
    const res = await api.get(`/users?${params}`)
    const { users, currentPage, totalPages, totalUsers } = res.data.data
    return {
      message: '',
      data: users,
      pagination: {
        currentPage,
        totalPages,
        totalItems: totalUsers,
        itemsPerPage: Number(filters.limit) || 10,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },
    }
  },

  getById: async (id: number): Promise<SingleResponse<User>> => {
    const res = await api.get(`/users/${id}`)
    return { message: '', data: res.data.data }
  },

  // Uses the admin-only POST /api/users route (not the public register endpoint)
  create: async (data: RegisterData): Promise<User> => {
    const res = await api.post('/users', data)
    return res.data.data.user
  },

  update: async (id: number, data: Partial<Pick<User, 'name' | 'email' | 'role'>>) => {
    const res = await api.put(`/users/${id}`, data)
    return res.data.data
  },

  delete: async (id: number): Promise<void> => { await api.delete(`/users/${id}`) },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post('/users/change-password', { currentPassword, newPassword })
  },
}

// ─── Orders API ───────────────────────────────────────────────────────────────

export const ordersApi = {
  getAll: async (page = 1, limit = 10, status?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (status) params.set('status', status)
    const res = await api.get(`/orders?${params}`)
    return res.data.data as { orders: import('@/types').Order[]; totalPages: number; currentPage: number; totalOrders: number }
  },
  updateStatus: async (id: number, status: string) => {
    const res = await api.patch(`/orders/${id}/status`, { status })
    return res.data.data as import('@/types').Order
  }
}

// ─── Audit Logs API ───────────────────────────────────────────────────────────

export const auditLogsApi = {
  getAll: async (params: { page?: number; limit?: number; entity?: string; action?: string } = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) query.set(k, String(v)) })
    const res = await api.get(`/audit-logs?${query}`)
    return res.data.data as { logs: import('@/types').AuditLog[]; totalPages: number; currentPage: number; totalLogs: number }
  }
}

// ─── Categories API ───────────────────────────────────────────────────────────

export const categoriesApi = {
  getAll: async (): Promise<{ categories: string[] }> => {
    const res = await api.get('/categories')
    return { categories: res.data.data }
  },
}

// ─── Analytics API ────────────────────────────────────────────────────────────

export const analyticsApi = {
  getDashboard: async (): Promise<import('@/types').DashboardAnalytics> => {
    const res = await api.get('/analytics/dashboard')
    return res.data.data
  }
}

export default api
