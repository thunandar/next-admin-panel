'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, Search, Trash2, Edit, Eye, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { productsApi, categoriesApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency, formatDate, getStockStatus, getPrimaryImage } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import { ConfirmModal } from '@/components/ui/Modal'
import { TableRowSkeleton } from '@/components/ui/Skeleton'
import type { Pagination as PaginationType, Product } from '@/types'

export default function ProductsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  const [products, setProducts] = useState<Product[]>([])
  const [pagination, setPagination] = useState<PaginationType | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [category, setCategory] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    categoriesApi.getAll().then(res => setCategories(res.categories)).catch(() => {})
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      if (search) {
        const res = await productsApi.search(search, page, 10)
        setProducts(res.data)
        setPagination(res.pagination)
      } else {
        const res = await productsApi.getAll({ page, limit: 10, category: category || undefined, sortBy, sortOrder })
        setProducts(res.data)
        setPagination(res.pagination)
      }
    } catch {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [page, search, category, sortBy, sortOrder])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await productsApi.delete(deleteTarget.id)
      toast.success('Product deleted')
      setDeleteTarget(null)
      fetchProducts()
    } catch {
      toast.error('Failed to delete product')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-[#38444d] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#253341] dark:text-white dark:placeholder-[#8b98a5]"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">Search</Button>
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
            >
              Clear
            </Button>
          )}
        </form>

        <div className="flex gap-2">
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-[#38444d] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#253341] dark:text-white"
          >
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={`${sortBy}_${sortOrder}`}
            onChange={(e) => {
              const parts = e.target.value.split('_')
              const by = parts[0] ?? 'createdAt'
              const order = parts[1] ?? 'DESC'
              setSortBy(by)
              setSortOrder(order as 'ASC' | 'DESC')
              setPage(1)
            }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-[#38444d] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#253341] dark:text-white"
          >
            <option value="createdAt_DESC">Newest first</option>
            <option value="createdAt_ASC">Oldest first</option>
            <option value="price_ASC">Price: Low → High</option>
            <option value="price_DESC">Price: High → Low</option>
            <option value="name_ASC">Name A–Z</option>
            <option value="stock_ASC">Low stock first</option>
          </select>

          {isAdmin && (
            <Link href="/admin/products/new">
              <Button size="sm">
                <Plus size={16} />
                Add Product
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1e2732] rounded-xl shadow-sm border border-gray-100 dark:border-[#38444d] overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th scope="col" className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Product</th>
                  <th scope="col" className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Category</th>
                  <th scope="col" className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Price</th>
                  <th scope="col" className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Stock</th>
                  <th scope="col" className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Added</th>
                  <th scope="col" className="px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {Array.from({ length: 10 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={6} />
                ))}
              </tbody>
            </table>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No products found</p>
            {isAdmin && (
              <Link href="/admin/products/new">
                <Button className="mt-4" size="sm">
                  <Plus size={16} /> Add your first product
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#253341] border-b border-gray-100 dark:border-[#38444d]">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Product</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Category</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Price</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Stock</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Added</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-[#253341]">
                  {products.map((product) => {
                    const status = getStockStatus(product.stock)
                    const img = getPrimaryImage(product.ProductImages)
                    return (
                      <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-[#253341] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#253341] overflow-hidden shrink-0">
                              {img !== '/placeholder.png' ? (
                                <Image src={img} alt={product.name} width={40} height={40} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package size={16} className="text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div>
                              <Link href={`/admin/products/${product.id}`} className="font-medium text-gray-900 dark:text-white hover:text-blue-600 transition-colors">
                                {product.name}
                              </Link>
                              {product.description && (
                                <p className="text-xs text-gray-400 dark:text-[#8b98a5] truncate max-w-45">{product.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {product.category ? <Badge variant="blue">{product.category}</Badge> : <span className="text-gray-400 text-sm">—</span>}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{formatCurrency(product.price)}</td>
                        <td className="px-6 py-4">
                          <Badge variant={status === 'ok' ? 'green' : status === 'low' ? 'yellow' : 'red'}>
                            {product.stock} units
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-[#8b98a5]">{formatDate(product.createdAt)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 justify-end">
                            <Link href={`/admin/products/${product.id}`}>
                              <button aria-label={`View ${product.name}`} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                <Eye size={15} />
                              </button>
                            </Link>
                            {isAdmin && (
                              <>
                                <Link href={`/admin/products/${product.id}/edit`}>
                                  <button aria-label={`Edit ${product.name}`} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                                    <Edit size={15} />
                                  </button>
                                </Link>
                                <button
                                  aria-label={`Delete ${product.name}`}
                                  onClick={() => setDeleteTarget(product)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
          </>
        )}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
