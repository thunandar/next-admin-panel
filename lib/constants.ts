// Shared constants used across the admin panel. Centralised here so cookie
// names, role checks, page sizes etc. are not duplicated as magic strings
// throughout pages and middleware.

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export const SHOP_URL =
  process.env.NEXT_PUBLIC_SHOP_URL || 'https://next-user-site.vercel.app'

// Auth cookie + role
export const ACCESS_TOKEN_COOKIE = 'admin_access_token'
export const ACCESS_TOKEN_MAX_AGE_DAYS = 30
export const ACCESS_TOKEN_MAX_AGE_SECONDS =
  ACCESS_TOKEN_MAX_AGE_DAYS * 24 * 60 * 60

export const ADMIN_ROLES = ['admin', 'super_admin'] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

export const isAdminRole = (role: string | null | undefined): boolean =>
  role === 'admin' || role === 'super_admin'

// UI defaults
export const DEFAULT_PAGE_SIZE = 10

// Theme
export const THEME_STORAGE_KEY = 'admin-theme'

// Routes
export const ROUTES = {
  login: '/login',
  dashboard: '/admin/dashboard',
} as const

// Order status visualisation — shared by orders list, dashboard, modals, CSV.
export const ORDER_STATUS_LABEL: Record<
  'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled',
  string
> = {
  pending: 'Pending',
  confirmed: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const ORDER_STATUS_TONE: Record<
  keyof typeof ORDER_STATUS_LABEL,
  'warn' | 'info' | 'sage' | 'success' | 'danger'
> = {
  pending: 'warn',
  confirmed: 'info',
  shipped: 'sage',
  delivered: 'success',
  cancelled: 'danger',
}
