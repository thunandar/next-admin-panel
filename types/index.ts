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
