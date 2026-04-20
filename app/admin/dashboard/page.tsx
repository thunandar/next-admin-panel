'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts'
import {
  Package, Users, ShoppingCart, TrendingUp, DollarSign,
  Clock, Eye, Heart, ArrowRight, Medal, Crown
} from 'lucide-react'
import { analyticsApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { CardSkeleton } from '@/components/ui/Skeleton'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import type { DashboardAnalytics } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  shipped: '#8b5cf6',
  delivered: '#10b981',
  cancelled: '#ef4444',
}

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6']

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    if (authLoading) return
    analyticsApi.getDashboard()
      .then(setAnalytics)
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false))
  }, [authLoading])

  if (loading) return <PageLoader />
  if (fetchError) return (
    <div className="text-center py-24 text-gray-400">
      <p className="text-lg font-medium">Failed to load dashboard</p>
      <p className="text-sm mt-1">Check your connection and try refreshing.</p>
    </div>
  )

  const statCards = [
    {
      label: 'Total Revenue',
      value: formatCurrency(analytics?.totalRevenue ?? 0),
      icon: DollarSign,
      color: 'bg-emerald-500',
      href: '/admin/orders',
      sub: 'confirmed + shipped + delivered',
    },
    {
      label: 'Total Orders',
      value: analytics?.totalOrders ?? 0,
      icon: ShoppingCart,
      color: 'bg-blue-500',
      href: '/admin/orders',
      sub: 'all time',
    },
    {
      label: 'Pending Orders',
      value: analytics?.pendingOrdersCount ?? 0,
      icon: Clock,
      color: 'bg-amber-500',
      href: '/admin/orders',
      sub: 'need attention',
      alert: (analytics?.pendingOrdersCount ?? 0) > 0,
    },
    {
      label: 'Total Users',
      value: analytics?.totalUsers ?? 0,
      icon: Users,
      color: 'bg-violet-500',
      href: '/admin/users',
      sub: 'registered',
    },
    {
      label: 'Total Products',
      value: analytics?.totalProducts ?? 0,
      icon: Package,
      color: 'bg-indigo-500',
      href: '/admin/products',
      sub: 'in catalog',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 dark:text-[#8b98a5] text-sm">Welcome back,</p>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user?.name}</h2>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium">
          <TrendingUp size={16} />
          Analytics Overview
        </div>
      </div>

      {/* Stat Cards */}
      <ErrorBoundary>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          {analytics
            ? statCards.map(({ label, value, icon: Icon, color, href, sub, alert }) => (
                <Link
                  key={label}
                  href={href}
                  className={`bg-white dark:bg-[#1e2732] rounded-xl p-5 shadow-sm border transition-shadow hover:shadow-md group ${alert ? 'border-amber-300 dark:border-amber-700' : 'border-gray-100 dark:border-[#38444d]'}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
                      <Icon size={20} className="text-white" />
                    </div>
                    <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                  <p className="text-sm text-gray-500 dark:text-[#8b98a5] mt-0.5">{label}</p>
                  {sub && <p className="text-xs text-gray-400 dark:text-[#8b98a5] mt-1">{sub}</p>}
                </Link>
              ))
            : Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </ErrorBoundary>

      {/* Revenue by Month + Order Status */}
      {analytics && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-[#1e2732] rounded-xl shadow-sm border border-gray-100 dark:border-[#38444d] p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Revenue Over Time</h3>
            <p className="text-xs text-gray-400 mb-4">Last 6 months (excluding cancelled orders)</p>
            {analytics.revenueByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={analytics.revenueByMonth} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number | undefined) => [formatCurrency(v ?? 0), 'Revenue']}
                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revenueGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-55 flex items-center justify-center text-gray-400 text-sm">No revenue data yet</div>
            )}
          </div>

          <div className="bg-white dark:bg-[#1e2732] rounded-xl shadow-sm border border-gray-100 dark:border-[#38444d] p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Order Status</h3>
            <p className="text-xs text-gray-400 mb-4">Breakdown by status</p>
            {analytics.orderStatusBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={analytics.orderStatusBreakdown}
                    cx="50%" cy="50%"
                    outerRadius={75}
                    dataKey="count"
                    nameKey="status"
                    label={({ percent }) => (percent ?? 0) > 0.05 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ''}
                    labelLine={false}
                  >
                    {analytics.orderStatusBreakdown.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] ?? PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number | undefined, name: string | undefined) => [v ?? 0, name ?? '']}
                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} formatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-55 flex items-center justify-center text-gray-400 text-sm">No orders yet</div>
            )}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      {analytics && (
        <div className="bg-white dark:bg-[#1e2732] rounded-xl shadow-sm border border-gray-100 dark:border-[#38444d]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#38444d]">
            <h3 className="font-semibold text-gray-900 dark:text-white">Recent Orders</h3>
            <Link href="/admin/orders" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#253341] border-b border-gray-100 dark:border-[#38444d]">
                  <th scope="col" className="text-left text-xs font-semibold text-gray-500 dark:text-[#8b98a5] uppercase tracking-wider px-6 py-3">Order</th>
                  <th scope="col" className="text-left text-xs font-semibold text-gray-500 dark:text-[#8b98a5] uppercase tracking-wider px-6 py-3">Customer</th>
                  <th scope="col" className="text-left text-xs font-semibold text-gray-500 dark:text-[#8b98a5] uppercase tracking-wider px-6 py-3">Amount</th>
                  <th scope="col" className="text-left text-xs font-semibold text-gray-500 dark:text-[#8b98a5] uppercase tracking-wider px-6 py-3">Status</th>
                  <th scope="col" className="text-left text-xs font-semibold text-gray-500 dark:text-[#8b98a5] uppercase tracking-wider px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-[#253341]">
                {analytics.recentOrders.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400 text-sm">No orders yet</td></tr>
                ) : analytics.recentOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-[#253341] transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">#{order.id}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{order.user?.name ?? '—'}</p>
                        <p className="text-xs text-gray-400 dark:text-[#8b98a5]">{order.user?.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800 dark:text-white">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                        style={{ background: `${STATUS_COLORS[order.status]}20`, color: STATUS_COLORS[order.status] }}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-[#8b98a5]">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Customers + Best Selling Products */}
      {analytics && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Customers */}
          <div className="bg-white dark:bg-[#1e2732] rounded-xl shadow-sm border border-gray-100 dark:border-[#38444d]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#38444d]">
              <div className="flex items-center gap-2">
                <Crown size={18} className="text-amber-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Top Customers</h3>
              </div>
              <Link href="/admin/users" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                All users <ArrowRight size={14} />
              </Link>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-[#253341]">
              {analytics.topCustomers.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">No order data yet</p>
              ) : analytics.topCustomers.map((tc, i) => (
                <div key={tc.user.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 dark:hover:bg-[#253341] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-gray-200 text-gray-600'}`}>
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{tc.user.name}</p>
                      <p className="text-xs text-gray-400">{tc.orderCount} order{tc.orderCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-emerald-600">{formatCurrency(tc.totalSpent)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Best Selling Products */}
          <div className="bg-white dark:bg-[#1e2732] rounded-xl shadow-sm border border-gray-100 dark:border-[#38444d]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#38444d]">
              <div className="flex items-center gap-2">
                <Medal size={18} className="text-blue-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Best Selling Products</h3>
              </div>
              <Link href="/admin/products" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                All products <ArrowRight size={14} />
              </Link>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-[#253341]">
              {analytics.bestSellingProducts.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">No sales data yet</p>
              ) : analytics.bestSellingProducts.map((bp, i) => (
                <div key={bp.product.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 dark:hover:bg-[#253341] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-gray-200 text-gray-600'}`}>
                      {i + 1}
                    </span>
                    <div>
                      <Link href={`/admin/products/${bp.product.id}`} className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600">
                        {bp.product.name}
                      </Link>
                      {bp.product.category && <p className="text-xs text-gray-400">{bp.product.category}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{bp.totalSold} units</p>
                    <p className="text-xs text-emerald-600">{formatCurrency(bp.totalRevenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Most Viewed + Most Wishlisted */}
      {analytics && (analytics.mostViewed.length > 0 || analytics.mostWishlisted.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Most Viewed */}
          <div className="bg-white dark:bg-[#1e2732] rounded-xl shadow-sm border border-gray-100 dark:border-[#38444d]">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-[#38444d]">
              <Eye size={18} className="text-indigo-500" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Most Viewed Products</h3>
                <p className="text-xs text-gray-400">Tracked from product detail pages</p>
              </div>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-[#253341]">
              {analytics.mostViewed.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">No view data yet</p>
              ) : analytics.mostViewed.map((mv, i) => (
                <div key={mv.product.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 dark:hover:bg-[#253341] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded text-xs font-semibold text-gray-400 flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div>
                      <Link href={`/admin/products/${mv.product.id}`} className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600">
                        {mv.product.name}
                      </Link>
                      {mv.product.category && <p className="text-xs text-gray-400">{mv.product.category}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-indigo-600">
                    <Eye size={13} />
                    <span className="text-sm font-semibold">{mv.viewCount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Most Wishlisted */}
          <div className="bg-white dark:bg-[#1e2732] rounded-xl shadow-sm border border-gray-100 dark:border-[#38444d]">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-[#38444d]">
              <Heart size={18} className="text-rose-500" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Most Wishlisted Products</h3>
                <p className="text-xs text-gray-400">High interest, potential conversions</p>
              </div>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-[#253341]">
              {analytics.mostWishlisted.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">No wishlist data yet</p>
              ) : analytics.mostWishlisted.map((wl, i) => (
                <div key={wl.product.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 dark:hover:bg-[#253341] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded text-xs font-semibold text-gray-400 flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div>
                      <Link href={`/admin/products/${wl.product.id}`} className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600">
                        {wl.product.name}
                      </Link>
                      {wl.product.category && <p className="text-xs text-gray-400">{wl.product.category}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-rose-500">
                    <Heart size={13} />
                    <span className="text-sm font-semibold">{wl.wishlistCount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New Users by Month */}
      {analytics && analytics.newUsersByMonth.length > 0 && (
        <div className="bg-white dark:bg-[#1e2732] rounded-xl shadow-sm border border-gray-100 dark:border-[#38444d] p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">New User Registrations</h3>
          <p className="text-xs text-gray-400 mb-4">Last 6 months</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={analytics.newUsersByMonth} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip
                formatter={(v: number | undefined) => [v ?? 0, 'New Users']}
                contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
