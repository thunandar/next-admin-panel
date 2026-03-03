'use client'

import { useEffect, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { ordersApi } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import { PageLoader } from '@/components/ui/Spinner'
import type { Order } from '@/types'

const STATUS_VARIANT: Record<Order['status'], 'green' | 'blue' | 'yellow' | 'purple' | 'red'> = {
  pending: 'yellow', confirmed: 'blue', shipped: 'purple', delivered: 'green', cancelled: 'red'
}

const ALL_STATUSES: Order['status'][] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    ordersApi.getAll(page, 10, status || undefined)
      .then(res => { setOrders(res.orders); setTotalPages(res.totalPages) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, status])

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      await ordersApi.updateStatus(id, newStatus)
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus as Order['status'] } : o))
    } catch {}
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">All Orders</h1>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Order</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Customer</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Items</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Total</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Date</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900">#{order.id}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{order.user?.name}</p>
                    <p className="text-xs text-gray-400">{order.user?.email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {order.items && order.items.length > 0 ? (
                      <div className="space-y-0.5">
                        {order.items.map(item => (
                          <div key={item.id}>{item.product?.name ?? 'Product'} × {item.quantity}</div>
                        ))}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 font-bold text-blue-600">{formatCurrency(Number(order.totalAmount))}</td>
                  <td className="px-6 py-4">
                    <Badge variant={STATUS_VARIANT[order.status]}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(order.createdAt)}</td>
                  <td className="px-6 py-4">
                    {order.status !== 'cancelled' && order.status !== 'delivered' && (
                      <select
                        value={order.status}
                        onChange={e => updateStatus(order.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
                      >
                        {ALL_STATUSES.map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {orders.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <ShoppingCart size={32} className="mx-auto mb-2 opacity-40" />
              <p>No orders found</p>
            </div>
          )}
        </div>
      </div>

      {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
    </div>
  )
}
