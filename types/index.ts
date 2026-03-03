export interface User {
  id: number
  email: string
  name: string
  role: 'admin' | 'user'
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
  price: string | number
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
  refreshToken: string
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
  role?: 'admin' | 'user'
}

export interface UserFilters {
  page?: number
  limit?: number
  role?: 'admin' | 'user'
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
  price: string | number
  product?: Product
}

export interface Order {
  id: number
  userId: number
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  totalAmount: string | number
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
