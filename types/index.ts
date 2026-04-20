export interface User {
  id: number
  email: string
  name: string
  role: 'super_admin' | 'admin' | 'user'
  createdAt: string
  updatedAt: string
}

export interface ProductImage {
  id: number
  productId: number
  imageUrl: string
  imageFilename: string
  isPrimary: boolean
  sortOrder: number
}

export interface Product {
  id: number
  name: string
  description: string | null
  price: number
  stock: number
  category: string | null
  ProductImages: ProductImage[]
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
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface CreateProductData {
  name: string
  description?: string
  price: number
  stock: number
  category?: string
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
  role?: 'super_admin' | 'admin' | 'user'
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

export interface Order {
  id: number
  userId: number
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  totalAmount: number
  shippingAddress: string | null
  notes: string | null
  items: OrderItem[]
  user?: { id: number; name: string; email: string }
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
