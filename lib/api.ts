import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import type {
  AuditLog,
  AuthResponse,
  CreateProductData,
  DashboardAnalytics,
  Order,
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

const buildParams = (obj: object): URLSearchParams => {
  const params = new URLSearchParams()
  Object.entries(obj).forEach(([k, v]: [string, unknown]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
  })
  return params
}

const buildPaginatedResponse = <T>(
  data: T[],
  currentPage: number,
  totalPages: number,
  totalItems: number,
  itemsPerPage: number
): PaginatedResponse<T> => ({
  message: '',
  data,
  pagination: {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  },
})

const buildFormData = (data: Record<string, unknown>, files?: File[], fileKey = 'images'): FormData => {
  const form = new FormData()
  Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== null) form.append(k, String(v)) })
  files?.forEach(f => form.append(fileKey, f))
  return form
}

// Normalize product prices from the backend (may arrive as strings)
const normalizeProduct = (p: unknown): Product => {
  const prod = p as Product & { price: string | number }
  return { ...prod, price: Number(prod.price) }
}

// Normalize order amounts from the backend (may arrive as strings)
const normalizeOrder = (o: unknown): Order => {
  const ord = o as Order & { totalAmount: string | number }
  return { ...ord, totalAmount: Number(ord.totalAmount) }
}

// ─── Token Management ────────────────────────────────────────────────────────
// Access token lives in memory only — no localStorage, reducing XSS exposure.
// A non-HttpOnly cookie copy is kept solely so the middleware can read it for
// server-side route guarding. The refresh token stays in an HttpOnly cookie.

let _accessToken: string | null = null

export const tokenStore = {
  getAccess: () => _accessToken,
  set: (access: string) => {
    _accessToken = access
    if (typeof window === 'undefined') return
    document.cookie = `admin_access_token=${access}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Strict`
  },
  clear: () => {
    _accessToken = null
    if (typeof window === 'undefined') return
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
      const res = await axios.post('/api/auth/refresh')
      const { accessToken } = res.data.data
      tokenStore.set(accessToken)
      flushQueue(null, accessToken)
      original.headers.Authorization = `Bearer ${accessToken}`
      return api(original)
    } catch (err) {
      flushQueue(err)
      tokenStore.clear()
      await axios.post('/api/auth/logout').catch(() => {})
      if (typeof window !== 'undefined') window.location.href = '/login'
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  },
)

// ─── Auth API ─────────────────────────────────────────────────────────────────

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
    await axios.post('/api/auth/logout')
  },
  getMe: async (): Promise<{ user: User }> => {
    const res = await api.get('/auth/me')
    return { user: res.data.data }
  },
}

// ─── Products API ─────────────────────────────────────────────────────────────

export const productsApi = {
  getAll: async (filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> => {
    const res = await api.get(`/products?${buildParams(filters)}`)
    const { products, currentPage, totalPages, totalProducts } = res.data.data
    return buildPaginatedResponse(products.map(normalizeProduct), currentPage, totalPages, totalProducts, Number(filters.limit) || 10)
  },

  getById: async (id: number): Promise<SingleResponse<Product>> => {
    const res = await api.get(`/products/${id}`)
    return { message: '', data: normalizeProduct(res.data.data) }
  },

  search: async (term: string, page = 1, limit = 10): Promise<PaginatedResponse<Product>> => {
    const res = await api.get(`/products/search?${buildParams({ search: term, page, limit })}`)
    const { products, currentPage, totalPages, totalProducts } = res.data.data
    return buildPaginatedResponse(products.map(normalizeProduct), currentPage, totalPages, totalProducts, limit)
  },

  create: async (data: CreateProductData, images?: File[]): Promise<SingleResponse<Product>> =>
    (await api.post('/products', buildFormData(data as unknown as Record<string, unknown>, images), { headers: { 'Content-Type': 'multipart/form-data' } })).data,

  update: async (id: number, data: UpdateProductData, images?: File[]): Promise<SingleResponse<Product>> =>
    (await api.put(`/products/${id}`, buildFormData(data as unknown as Record<string, unknown>, images), { headers: { 'Content-Type': 'multipart/form-data' } })).data,

  delete: async (id: number): Promise<void> => { await api.delete(`/products/${id}`) },
}

// ─── Users API ────────────────────────────────────────────────────────────────

export const usersApi = {
  getAll: async (filters: UserFilters = {}): Promise<PaginatedResponse<User>> => {
    const res = await api.get(`/users?${buildParams(filters)}`)
    const { users, currentPage, totalPages, totalUsers } = res.data.data
    return buildPaginatedResponse(users, currentPage, totalPages, totalUsers, Number(filters.limit) || 10)
  },

  getById: async (id: number): Promise<SingleResponse<User>> => {
    const res = await api.get(`/users/${id}`)
    return { message: '', data: res.data.data }
  },

  create: async (data: RegisterData): Promise<User> => {
    const res = await api.post('/users', data)
    return res.data.data.user
  },

  update: async (id: number, data: Partial<Pick<User, 'name' | 'email' | 'role'>>): Promise<User> => {
    const res = await api.put(`/users/${id}`, data)
    return res.data.data as User
  },

  delete: async (id: number): Promise<void> => { await api.delete(`/users/${id}`) },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post('/users/change-password', { currentPassword, newPassword })
  },
}

// ─── Orders API ───────────────────────────────────────────────────────────────

export const ordersApi = {
  getAll: async (page = 1, limit = 10, status?: string): Promise<{ orders: Order[]; totalPages: number; currentPage: number; totalOrders: number }> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (status) params.set('status', status)
    const res = await api.get(`/orders?${params}`)
    const raw = res.data.data as { orders: unknown[]; totalPages: number; currentPage: number; totalOrders: number }
    return { ...raw, orders: raw.orders.map(normalizeOrder) }
  },
  updateStatus: async (id: number, status: string): Promise<Order> => {
    const res = await api.patch(`/orders/${id}/status`, { status })
    return normalizeOrder(res.data.data)
  },
}

// ─── Audit Logs API ───────────────────────────────────────────────────────────

export const auditLogsApi = {
  getAll: async (params: { page?: number; limit?: number; entity?: string; action?: string } = {}): Promise<{ logs: AuditLog[]; totalPages: number; currentPage: number; totalLogs: number }> => {
    const res = await api.get(`/audit-logs?${buildParams(params)}`)
    return res.data.data as { logs: AuditLog[]; totalPages: number; currentPage: number; totalLogs: number }
  },
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
  getDashboard: async (): Promise<DashboardAnalytics> => {
    const res = await api.get('/analytics/dashboard')
    return res.data.data
  },
}

export default api
