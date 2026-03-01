'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, Users, AlertTriangle, Tag, ArrowRight, TrendingUp } from 'lucide-react'
import { productsApi, usersApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency, formatDate, getStockStatus } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import type { Product } from '@/types'

interface Stats {
  totalProducts: number
  totalUsers: number
  lowStockCount: number
  categoryCount: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentProducts, setRecentProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [productsRes, lowStockRes] = await Promise.all([
          productsApi.getAll({ page: 1, limit: 5, sortBy: 'createdAt', sortOrder: 'DESC' }),
          productsApi.getAll({ page: 1, limit: 100 }),
        ])

        const allProducts = lowStockRes.data
        const categories = new Set(allProducts.map((p) => p.category).filter(Boolean))
        const lowStock = allProducts.filter((p) => p.stock <= 5).length

        let totalUsers = 0
        if (user?.role === 'admin') {
          const usersRes = await usersApi.getAll({ page: 1, limit: 1 })
          totalUsers = usersRes.pagination.totalItems
        }

        setStats({
          totalProducts: productsRes.pagination.totalItems,
          totalUsers,
          lowStockCount: lowStock,
          categoryCount: categories.size,
        })
        setRecentProducts(productsRes.data)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.role])

  if (loading) return <PageLoader />

  const statCards = [
    { label: 'Total Products', value: stats?.totalProducts ?? 0, icon: Package, color: 'bg-blue-500', href: '/products' },
    { label: 'Categories', value: stats?.categoryCount ?? 0, icon: Tag, color: 'bg-purple-500', href: '/products' },
    { label: 'Low Stock', value: stats?.lowStockCount ?? 0, icon: AlertTriangle, color: 'bg-amber-500', href: '/products' },
    ...(user?.role === 'admin'
      ? [{ label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'bg-green-500', href: '/users' }]
      : []),
  ]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">Good to see you,</p>
          <h2 className="text-2xl font-bold text-gray-900">{user?.name} 👋</h2>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
          <TrendingUp size={16} />
          Overview
        </div>
      </div>

      {/* Stats */}
      <div className={`grid gap-4 ${user?.role === 'admin' ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3'}`}>
        {statCards.map(({ label, value, icon: Icon, color, href }) => (
          <Link
            key={label}
            href={href}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
                <Icon size={20} className="text-white" />
              </div>
              <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </Link>
        ))}
      </div>

      {/* Recent Products */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Products</h3>
          <Link href="/products" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Product</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Category</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Price</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Stock</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentProducts.map((product) => {
                const status = getStockStatus(product.stock)
                return (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/products/${product.id}`} className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                        {product.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      {product.category ? (
                        <Badge variant="blue">{product.category}</Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium">{formatCurrency(product.price)}</td>
                    <td className="px-6 py-4">
                      <Badge variant={status === 'ok' ? 'green' : status === 'low' ? 'yellow' : 'red'}>
                        {product.stock} units
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(product.createdAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {recentProducts.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Package size={32} className="mx-auto mb-2 opacity-40" />
              <p>No products yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
