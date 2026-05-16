import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import type {
  AuditLog,
  AuthResponse,
  Category,
  CreateOrderData,
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
  Vendor,
} from '@/types'
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  API_BASE_URL,
  DEFAULT_PAGE_SIZE,
  ROUTES,
} from './constants'

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

// Rehydrate the in-memory token from the cookie on first client-side import.
// Without this, every page load starts with no Authorization header, forcing a
// 401 + refresh round-trip — which also breaks Playwright runs because the
// backend rotates refresh tokens and only the first test can succeed.
if (typeof document !== 'undefined') {
  const prefix = `${ACCESS_TOKEN_COOKIE}=`
  const found = document.cookie.split('; ').find((c) => c.startsWith(prefix))
  if (found) _accessToken = found.slice(prefix.length)
}

export const tokenStore = {
  getAccess: () => _accessToken,
  set: (access: string) => {
    _accessToken = access
    if (typeof window === 'undefined') return
    document.cookie = `${ACCESS_TOKEN_COOKIE}=${access}; path=/; max-age=${ACCESS_TOKEN_MAX_AGE_SECONDS}; SameSite=Strict`
  },
  clear: () => {
    _accessToken = null
    if (typeof window === 'undefined') return
    document.cookie = `${ACCESS_TOKEN_COOKIE}=; path=/; max-age=0`
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
      if (typeof window !== 'undefined') window.location.href = ROUTES.login
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  },
)

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  login: async (email: string, password: string, twoFactorToken?: string): Promise<AuthResponse> => {
    const res = await axios.post('/api/auth/login', { email, password, twoFactorToken })
    const { user, accessToken } = res.data.data
    return { message: res.data.message, user, tokens: { accessToken } }
  },
  // Hits the Next route handler (same origin) so the HttpOnly refresh cookie is read.
  refresh: async (): Promise<{ accessToken: string }> => {
    const res = await axios.post('/api/auth/refresh')
    return res.data.data
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
    return buildPaginatedResponse(products.map(normalizeProduct), currentPage, totalPages, totalProducts, Number(filters.limit) || DEFAULT_PAGE_SIZE)
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
    return buildPaginatedResponse(users, currentPage, totalPages, totalUsers, Number(filters.limit) || DEFAULT_PAGE_SIZE)
  },

  getById: async (id: number): Promise<SingleResponse<User>> => {
    const res = await api.get(`/users/${id}`)
    return { message: '', data: res.data.data }
  },

  create: async (data: RegisterData): Promise<User> => {
    const res = await api.post('/users', data)
    return res.data.data.user
  },

  update: async (id: number, data: Partial<Pick<User, 'name' | 'email' | 'role' | 'status'>>): Promise<User> => {
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
  getAll: async (page = 1, limit = 10, status?: string, productId?: number): Promise<{ orders: Order[]; totalPages: number; currentPage: number; totalOrders: number }> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (status) params.set('status', status)
    if (productId != null) params.set('productId', String(productId))
    const res = await api.get(`/orders?${params}`)
    const raw = res.data.data as { orders: unknown[]; totalPages: number; currentPage: number; totalOrders: number }
    return { ...raw, orders: raw.orders.map(normalizeOrder) }
  },
  getById: async (id: number): Promise<Order> => {
    const res = await api.get(`/orders/${id}`)
    return normalizeOrder(res.data.data)
  },
  create: async (data: CreateOrderData): Promise<Order> => {
    const res = await api.post('/orders', data)
    return normalizeOrder(res.data.data)
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
  list: async (): Promise<Category[]> => {
    const res = await api.get('/categories')
    return res.data.data
  },
  getById: async (id: number): Promise<Category> => {
    const res = await api.get(`/categories/${id}`)
    return res.data.data
  },
  create: async (data: { name: string; slug?: string }): Promise<Category> => {
    const res = await api.post('/categories', data)
    return res.data.data
  },
  update: async (id: number, data: { name?: string; slug?: string }): Promise<Category> => {
    const res = await api.put(`/categories/${id}`, data)
    return res.data.data
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/categories/${id}`)
  },
}

// ─── Vendors API ──────────────────────────────────────────────────────────────

export interface VendorWriteData {
  name: string
  slug?: string
  description?: string | null
  websiteUrl?: string | null
  status?: 'active' | 'inactive'
}

const buildVendorForm = (
  data: Partial<VendorWriteData>,
  logo?: File | null,
  clearLogo?: boolean,
) => {
  const form = new FormData()
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined && v !== null) form.append(k, String(v))
  })
  if (logo) form.append('logo', logo)
  // Empty string tells the backend to clear the stored logoUrl.
  else if (clearLogo) form.append('logoUrl', '')
  return form
}

export const vendorsApi = {
  list: async (params: { status?: string; search?: string } = {}): Promise<Vendor[]> => {
    const res = await api.get('/vendors', { params })
    return res.data.data
  },
  getById: async (id: number): Promise<Vendor> => {
    const res = await api.get(`/vendors/${id}`)
    return res.data.data
  },
  create: async (data: VendorWriteData, logo?: File | null): Promise<Vendor> => {
    const form = buildVendorForm(data, logo)
    const res = await api.post('/vendors', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  },
  update: async (
    id: number,
    data: Partial<VendorWriteData>,
    logo?: File | null,
    options: { clearLogo?: boolean } = {},
  ): Promise<Vendor> => {
    const form = buildVendorForm(data, logo, options.clearLogo)
    const res = await api.put(`/vendors/${id}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/vendors/${id}`)
  },
}

// ─── Analytics API ────────────────────────────────────────────────────────────

export type NexusDashboardSeriesPoint = { date: string; value: number }

export interface NexusDashboardStat {
  value: number
  delta: number
}

export interface NexusDashboardTopProduct {
  product: { id: number; name: string; category?: string; price: string | number; vendor?: string | null }
  totalSold: number
  totalRevenue: number
}

export interface NexusDashboard {
  stats: {
    revenue: NexusDashboardStat
    orders: NexusDashboardStat
    visitors: NexusDashboardStat
    conversion: NexusDashboardStat
  }
  series: {
    revenue: NexusDashboardSeriesPoint[]
    orders: NexusDashboardSeriesPoint[]
    visitors: NexusDashboardSeriesPoint[]
  }
  topProducts: NexusDashboardTopProduct[]
  recentOrders: Order[]
  activity: Array<{
    id: number
    actor: string
    action: string
    entity: string
    entityId?: number | null
    details?: unknown
    createdAt: string
  }>
}

export interface OwnerInsights {
  kpis: {
    totalRevenue: number
    avgOrderValue: number
    paidOrders: number
    totalOrders: number
    totalCustomers: number
    repeatCustomers: number
    repeatRate: number
    fulfillmentRate: number
    inventoryValue: number
    inventoryUnits: number
    lowStockThreshold: number
    grossProfit: number
    grossMarginPct: number
  }
  margin: {
    revenue: number
    cogs: number
    profit: number
    marginPct: number
    byProduct: Array<{
      id: number
      name: string
      units: number
      revenue: number
      cogs: number
      profit: number
      marginPct: number
    }>
  }
  trafficSources: Array<{ source: string; views: number }>
  refunds: { approvedAmount: number; pendingAmount: number; pendingCount: number }
  abandoned: { count: number; value: number }
  topCustomers: Array<{
    user: { id: number; name: string; email: string } | null
    totalSpent: number
    orderCount: number
    lastOrderAt: string | null
  }>
  orderStatus: Array<{ status: string; count: number }>
  lowStock: Array<{ id: number; name: string; stock: number; price: number; status: string }>
  revenueByMonth: Array<{ month: string; revenue: number; orders: number }>
  newUsersByMonth: Array<{ month: string; count: number }>
  mostWishlisted: Array<{
    product: { id: number; name: string; price: string | number } | null
    wishlistCount: number
  }>
  mostViewed: Array<{
    product: { id: number; name: string; price: string | number } | null
    viewCount: number
  }>
}

export const analyticsApi = {
  getDashboard: async (): Promise<DashboardAnalytics> => {
    const res = await api.get('/analytics/dashboard')
    return res.data.data
  },
  getNexusDashboard: async (range?: string): Promise<NexusDashboard> => {
    const res = await api.get('/analytics/nexus-dashboard', {
      params: range ? { range } : undefined,
    })
    return res.data.data
  },
  getOwnerInsights: async (): Promise<OwnerInsights> => {
    const res = await api.get('/analytics/owner-insights')
    return res.data.data
  },
}

// ─── Profile API ──────────────────────────────────────────────────────────────

export const profileApi = {
  get: async (): Promise<User> => {
    const res = await api.get('/profile')
    return res.data.data as User
  },
  update: async (patch: Partial<User>): Promise<User> => {
    const res = await api.put('/profile', patch)
    return res.data.data as User
  },
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.put('/profile/password', { currentPassword, newPassword })
  },
  uploadAvatar: async (file: File): Promise<User> => {
    const form = new FormData()
    form.append('avatar', file)
    const res = await api.post('/profile/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data as User
  },
  setup2FA: async (): Promise<{ secret: string; qrDataUrl: string }> => {
    const res = await api.post('/profile/2fa/setup')
    return res.data.data
  },
  verify2FA: async (token: string): Promise<User> => {
    const res = await api.post('/profile/2fa/verify', { token })
    return res.data.data as User
  },
  disable2FA: async (password: string): Promise<User> => {
    const res = await api.post('/profile/2fa/disable', { password })
    return res.data.data as User
  },
}

// ─── Push (browser notifications) API ─────────────────────────────────────────

export const pushApi = {
  vapidKey: async (): Promise<string | null> => {
    const res = await api.get('/push/vapid-key')
    return res.data.data?.publicKey ?? null
  },
  subscribe: async (sub: PushSubscriptionJSON): Promise<void> => {
    await api.post('/push/subscribe', sub)
  },
  unsubscribe: async (endpoint: string): Promise<void> => {
    await api.post('/push/unsubscribe', { endpoint })
  },
}

// ─── Variants API ─────────────────────────────────────────────────────────────

export interface ProductVariant {
  id: number
  productId: number
  name: string
  sku?: string | null
  size?: string | null
  color?: string | null
  colorHex?: string | null
  priceOverride?: string | null
  stock: number
  sortOrder: number
}

export const variantsApi = {
  list: async (productId: number | string): Promise<ProductVariant[]> => {
    const res = await api.get(`/products/${productId}/variants`)
    return res.data.data
  },
  create: async (productId: number | string, data: Partial<ProductVariant>): Promise<ProductVariant> => {
    const res = await api.post(`/products/${productId}/variants`, data)
    return res.data.data
  },
  update: async (productId: number | string, id: number, data: Partial<ProductVariant>): Promise<ProductVariant> => {
    const res = await api.put(`/products/${productId}/variants/${id}`, data)
    return res.data.data
  },
  remove: async (productId: number | string, id: number): Promise<void> => {
    await api.delete(`/products/${productId}/variants/${id}`)
  },
}

// ─── Coupons API ──────────────────────────────────────────────────────────────

export interface Coupon {
  id: number
  code: string
  kind: 'percent' | 'amount'
  value: string | number
  minSubtotal?: string | null
  maxUses?: number | null
  usedCount: number
  expiresAt?: string | null
  active: boolean
  description?: string | null
}

// ─── Journal API ──────────────────────────────────────────────────────────────

export interface JournalPost {
  id: number
  slug: string
  title: string
  eyebrow: string | null
  excerpt: string | null
  body: string
  coverImageUrl: string | null
  coverImageFilename: string | null
  author: string | null
  published: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

const buildJournalForm = (data: Partial<JournalPost>, cover?: File | null): FormData => {
  const form = new FormData()
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined && v !== null) form.append(k, String(v))
  })
  if (cover) form.append('image', cover)
  return form
}

export const journalApi = {
  list: async (page = 1, limit = 20, all = true): Promise<{ posts: JournalPost[]; totalPages: number; currentPage: number; totalPosts: number }> => {
    const res = await api.get(`/journal?${buildParams({ page, limit, all: all ? 'true' : undefined })}`)
    return res.data.data
  },
  getById: async (id: number): Promise<JournalPost> => {
    const res = await api.get(`/journal/${id}`)
    return res.data.data
  },
  create: async (data: Partial<JournalPost>, cover?: File | null): Promise<JournalPost> => {
    const res = await api.post('/journal', buildJournalForm(data, cover), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  },
  update: async (id: number, data: Partial<JournalPost>, cover?: File | null): Promise<JournalPost> => {
    const res = await api.put(`/journal/${id}`, buildJournalForm(data, cover), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/journal/${id}`)
  },
}

// ─── Site Settings API ────────────────────────────────────────────────────────

export interface PromoBannerSetting {
  enabled: boolean
  message: string
}

export interface HeroSetting {
  eyebrow: string
  headlineLead: string
  headlineAccent: string
  headlineTrail: string
  body: string
  primaryCtaLabel: string
  primaryCtaHref: string
  secondaryCtaLabel: string
  secondaryCtaHref: string
}

export interface BrandSetting {
  name: string
  tagline: string
  location: string
}

export const TRUST_ICON_KEYS = ['truck', 'refund', 'shield', 'chat', 'ship', 'globe', 'spark', 'tag', 'heart', 'star'] as const
export type TrustIconKey = (typeof TRUST_ICON_KEYS)[number]

export interface TrustItem {
  iconKey: TrustIconKey
  title: string
  sub: string
}

export interface TrustSetting {
  items: TrustItem[]
}

export interface SiteSettings {
  promoBanner: PromoBannerSetting
  hero: HeroSetting
  brand: BrandSetting
  trust: TrustSetting
}

export const settingsApi = {
  getPublic: async (): Promise<SiteSettings> => {
    const res = await api.get('/settings/public')
    return res.data.data as SiteSettings
  },
  update: async (patch: Partial<SiteSettings>): Promise<SiteSettings> => {
    const res = await api.put('/settings', patch)
    return res.data.data as SiteSettings
  },
}

export interface AdminReview {
  id: number
  productId: number
  userId: number
  rating: number
  comment: string | null
  published: boolean
  createdAt: string
  updatedAt: string
  user?: { id: number; name: string; email: string } | null
  product?: { id: number; name: string } | null
}

export const reviewsApi = {
  list: async (params: { page?: number; limit?: number; productId?: number; rating?: number; search?: string } = {}): Promise<{
    reviews: AdminReview[]
    totalReviews: number
    totalPages: number
    currentPage: number
    avgRating: number | null
  }> => {
    const res = await api.get(`/reviews?${buildParams(params as Record<string, unknown>)}`)
    return res.data.data
  },
  setPublished: async (id: number, published: boolean): Promise<AdminReview> => {
    const res = await api.patch(`/reviews/${id}/publish`, { published })
    return res.data.data
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/reviews/${id}`)
  },
}

// ─── Refunds API ──────────────────────────────────────────────────────────────

export interface Refund {
  id: number
  orderId: number
  amount: string | number
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  updatedAt: string
  order?: {
    id: number
    totalAmount: string | number
    status: string
    user?: { id: number; name: string; email: string } | null
  }
  issuedBy?: { id: number; name: string } | null
}

export const refundsApi = {
  list: async (params: { page?: number; limit?: number; status?: string } = {}): Promise<{
    refunds: Refund[]
    totalRefunds: number
    totalPages: number
    currentPage: number
  }> => {
    const res = await api.get(`/refunds?${buildParams(params as Record<string, unknown>)}`)
    return res.data.data
  },
  stats: async (): Promise<{
    approvedAmount: number
    pendingAmount: number
    count: number
    byStatus: Array<{ status: string; count: number }>
  }> => {
    const res = await api.get('/refunds/stats')
    return res.data.data
  },
  create: async (data: { orderId: number; amount: number; reason?: string }): Promise<Refund> => {
    const res = await api.post('/refunds', data)
    return res.data.data
  },
  setStatus: async (id: number, status: 'pending' | 'approved' | 'rejected'): Promise<Refund> => {
    const res = await api.patch(`/refunds/${id}/status`, { status })
    return res.data.data
  },
}

// ─── Abandoned Checkouts API ──────────────────────────────────────────────────

export interface AbandonedCheckout {
  id: number
  userId: number | null
  email: string | null
  items: Array<{ productId: number; name?: string; quantity: number; price: number }>
  totalAmount: string | number
  createdAt: string
  user?: { id: number; name: string; email: string } | null
}

export const abandonedCheckoutsApi = {
  list: async (params: { page?: number; limit?: number; minAgeMinutes?: number } = {}): Promise<{
    checkouts: AbandonedCheckout[]
    totalCheckouts: number
    totalPages: number
    currentPage: number
  }> => {
    const res = await api.get(`/abandoned-checkouts?${buildParams(params as Record<string, unknown>)}`)
    return res.data.data
  },
}

export const couponsApi = {
  list: async (): Promise<Coupon[]> => {
    const res = await api.get('/coupons')
    return res.data.data
  },
  create: async (data: Partial<Coupon>): Promise<Coupon> => {
    const res = await api.post('/coupons', data)
    return res.data.data
  },
  update: async (id: number, data: Partial<Coupon>): Promise<Coupon> => {
    const res = await api.put(`/coupons/${id}`, data)
    return res.data.data
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/coupons/${id}`)
  },
}

export default api
