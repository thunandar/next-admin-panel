'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { Package, Users, AlertTriangle, Tag, ArrowRight, TrendingUp, ShoppingCart } from 'lucide-react'
import { productsApi, usersApi, ordersApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency, formatDate, getStockStatus } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { CardSkeleton } from '@/components/ui/Skeleton'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import type { Product } from '@/types'

interface Stats {
  totalProducts: number
  totalUsers: number
  lowStockCount: number
  categoryCount: number
  totalOrders: number
}

interface CategoryData { name: string; count: number }

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentProducts, setRecentProducts] = useState<Product[]>([])
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [stockData, setStockData] = useState<{ name: string; value: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    const load = async () => {
      try {
        const [productsRes, allProductsRes, usersRes, ordersRes] = await Promise.all([
          productsApi.getAll({ page: 1, limit: 5, sortBy: 'createdAt', sortOrder: 'DESC' }),
          productsApi.getAll({ page: 1, limit: 100 }),
          usersApi.getAll({ page: 1, limit: 1 }),
          ordersApi.getAll(1, 1),
        ])

        const allProducts = allProductsRes.data
        const categoryCounts: Record<string, number> = {}
        let inStock = 0, lowStock = 0, outOfStock = 0

        for (const p of allProducts) {
          if (p.category) categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1
          const s = getStockStatus(p.stock)
          if (s === 'ok') inStock++
          else if (s === 'low') lowStock++
          else outOfStock++
        }

        setCategoryData(Object.entries(categoryCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count))
        setStockData([
          { name: 'In Stock', value: inStock },
          { name: 'Low Stock', value: lowStock },
          { name: 'Out of Stock', value: outOfStock },
        ])

        setStats({
          totalProducts: productsRes.pagination.totalItems,
          totalUsers: usersRes.pagination.totalItems,
          lowStockCount: lowStock,
          categoryCount: Object.keys(categoryCounts).length,
          totalOrders: ordersRes.totalOrders,
        })
        setRecentProducts(productsRes.data)
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [authLoading])

  if (loading) return <PageLoader />

  const statCards = [
    { label: 'Total Products', value: stats?.totalProducts ?? 0, icon: Package, color: 'bg-blue-500', href: '/admin/products' },
    { label: 'Categories', value: stats?.categoryCount ?? 0, icon: Tag, color: 'bg-purple-500', href: '/admin/products' },
    { label: 'Low Stock', value: stats?.lowStockCount ?? 0, icon: AlertTriangle, color: 'bg-amber-500', href: '/admin/products' },
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'bg-green-500', href: '/admin/users' },
    { label: 'Total Orders', value: stats?.totalOrders ?? 0, icon: ShoppingCart, color: 'bg-indigo-500', href: '/admin/orders' },
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
      <ErrorBoundary>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          {stats
            ? statCards.map(({ label, value, icon: Icon, color, href }) => (
                <Link key={label} href={href} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
                      <Icon size={20} className="text-white" />
                    </div>
                    <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{value}</p>
                  <p className="text-sm text-gray-500 mt-1">{label}</p>
                </Link>
              ))
            : Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </ErrorBoundary>

      {/* Charts */}
      {categoryData.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Products by Category</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Stock Status</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={stockData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                  label={({ percent }) => percent > 0 ? `${(percent * 100).toFixed(0)}%` : ''}
                  labelLine={false}
                >
                  {stockData.map((_, i) => <Cell key={i} fill={['#10b981', '#f59e0b', '#ef4444'][i]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Products */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Products</h3>
          <Link href="/admin/products" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
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
                      <Link href={`/admin/products/${product.id}`} className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
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
