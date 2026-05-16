export interface User {
  id: number
  email: string
  name: string
  role: 'super_admin' | 'admin' | 'user'
  status?: 'active' | 'banned'
  lifetimeSpend?: string | number
  avatarUrl?: string | null
  displayName?: string | null
  timezone?: string | null
  twoFactorEnabled?: boolean
  loginAlerts?: boolean
  notifyNewOrders?: NotificationChannel
  notifyLowStock?: NotificationChannel
  notifyDailySummary?: NotificationChannel
  notifyRefundRequests?: NotificationChannel
  addresses?: Address[]
  createdAt: string
  updatedAt: string
}

export type NotificationChannel = 'off' | 'email' | 'push' | 'email+push'

export interface ProductImage {
  id: number
  productId: number
  imageUrl: string
  imageFilename: string
  isPrimary: boolean
  sortOrder: number
}

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

export interface Category {
  id: number
  name: string
  slug: string
  createdAt?: string
  updatedAt?: string
}

export interface Vendor {
  id: number
  name: string
  slug: string
  logoUrl: string | null
  description: string | null
  websiteUrl: string | null
  status: 'active' | 'inactive'
  createdAt?: string
  updatedAt?: string
}

export interface Product {
  id: number
  name: string
  description: string | null
  price: number
  stock: number
  categoryId: number | null
  // Virtual field surfaced from the Category relation — Category.name, or null.
  category: string | null
  Category?: Category | null
  ProductImages: ProductImage[]
  // Nexus extensions
  tags?: string[]
  vendorId?: number | null
  // Virtual field surfaced from the Vendor relation — Vendor.name, or null.
  vendor?: string | null
  Vendor?: Pick<Vendor, 'id' | 'name' | 'slug' | 'logoUrl'> | null
  salesCount?: number
  status?: 'active' | 'draft' | 'out' | 'archived'
  isFeatured?: boolean
  featuredOrder?: number
  compareAtPrice?: string | number | null
  costPerItem?: string | number | null
  slug?: string | null
  metaTitle?: string | null
  trackInventory?: boolean
  continueSelling?: boolean
  variants?: ProductVariant[]
  createdAt: string
  updatedAt: string
}

export interface Pagination {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface PaginatedResponse<T> {
  message: string
  data: T[]
  pagination: Pagination
}

export interface SingleResponse<T> {
  message: string
  data: T
}

export interface AuthTokens {
  accessToken: string
  refreshToken?: string // now stored in HttpOnly cookie — not exposed to JS
}

export interface AuthResponse {
  message: string
  user: User
  tokens: AuthTokens
}

export interface ProductFilters {
  page?: number
  limit?: number
  category?: string
  categoryId?: number | string
  minPrice?: number
  maxPrice?: number
  inStock?: boolean | string
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  status?: string
  tags?: string
  vendor?: string
  vendorId?: number | string
  search?: string
  isFeatured?: 'true' | 'false'
}

export interface CreateProductData {
  name: string
  description?: string
  price: number
  stock: number
  categoryId?: number | null
}

export type UpdateProductData = Partial<CreateProductData>

export interface RegisterData {
  email: string
  password: string
  name: string
  role?: 'super_admin' | 'admin' | 'user'
}

export interface UserFilters {
  page?: number
  limit?: number
  role?: 'super_admin' | 'admin' | 'user' | string
  search?: string
}

export interface Review {
  id: number
  productId: number
  userId: number
  rating: number
  comment: string | null
  user: { id: number; name: string }
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: number
  orderId: number
  productId: number
  quantity: number
  price: number
  product?: Product
}

export interface Address {
  id: number
  userId: number
  name: string
  line1: string
  line2: string | null
  city: string
  region: string | null
  postal: string
  country: string
  phone: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface Order {
  id: number
  userId: number
  placedById: number | null
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  totalAmount: number
  shippingAddress: string | null
  shippingAddressId: number | null
  address?: Address | null
  notes: string | null
  items: OrderItem[]
  user?: { id: number; name: string; email: string }
  placedBy?: { id: number; name: string; email: string } | null
  createdAt: string
  updatedAt: string
}

export interface WishlistItem {
  id: number
  userId: number
  productId: number
  product: Product
  createdAt: string
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface CreateOrderData {
  items: { productId: number; quantity: number }[]
  shippingAddress?: string
  notes?: string
  userId?: number
}

export interface AuditLog {
  id: number
  userId: number | null
  action: string
  entity: string
  entityId: number | null
  details: Record<string, unknown> | null
  ipAddress: string | null
  user?: { id: number; name: string; email: string }
  createdAt: string
}

export interface AnalyticsTopCustomer {
  user: { id: number; name: string; email: string }
  totalSpent: number
  orderCount: number
}

export interface AnalyticsBestProduct {
  product: { id: number; name: string; category: string | null; price: string | number }
  totalSold: number
  totalRevenue: number
}

export interface AnalyticsRevenueMonth {
  month: string
  revenue: number
  orders: number
}

export interface AnalyticsStatusBreakdown {
  status: string
  count: number
}

export interface AnalyticsMostWishlisted {
  product: { id: number; name: string; category: string | null; price: string | number }
  wishlistCount: number
}

export interface AnalyticsMostViewed {
  product: { id: number; name: string; category: string | null; price: string | number }
  viewCount: number
}

export interface AnalyticsNewUsers {
  month: string
  count: number
}

export interface DashboardAnalytics {
  totalRevenue: number
  totalProducts: number
  totalUsers: number
  totalOrders: number
  pendingOrdersCount: number
  recentOrders: Order[]
  topCustomers: AnalyticsTopCustomer[]
  bestSellingProducts: AnalyticsBestProduct[]
  revenueByMonth: AnalyticsRevenueMonth[]
  orderStatusBreakdown: AnalyticsStatusBreakdown[]
  mostWishlisted: AnalyticsMostWishlisted[]
  mostViewed: AnalyticsMostViewed[]
  newUsersByMonth: AnalyticsNewUsers[]
}
