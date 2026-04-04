'use client'

import { useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'
import { auditLogsApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import { PageLoader } from '@/components/ui/Spinner'
import type { AuditLog, Pagination as PaginationType } from '@/types'

const ACTION_VARIANT: Record<string, 'green' | 'blue' | 'red' | 'yellow' | 'gray'> = {
  create: 'green',
  update: 'blue',
  update_status: 'blue',
  delete: 'red',
  login: 'yellow',
  logout: 'gray',
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<PaginationType | null>(null)
  const [page, setPage] = useState(1)
  const [entity, setEntity] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    auditLogsApi.getAll({ page, limit: 20, entity: entity || undefined })
      .then(res => {
        setLogs(res.logs)
        setPagination({
          currentPage: res.currentPage,
          totalPages: res.totalPages,
          totalItems: res.totalLogs,
          itemsPerPage: 20,
          hasNextPage: res.currentPage < res.totalPages,
          hasPrevPage: res.currentPage > 1,
        })
      })
      .catch(() => toast.error('Failed to load audit logs'))
      .finally(() => setLoading(false))
  }, [page, entity])

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <select
          value={entity}
          onChange={e => { setEntity(e.target.value); setPage(1) }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Entities</option>
          {['product', 'user', 'order'].map(e => (
            <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Action</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Entity</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">User</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Details</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">IP</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Badge variant={ACTION_VARIANT[log.action] ?? 'gray'}>{log.action}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {log.entity} {log.entityId ? `#${log.entityId}` : ''}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{log.user?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{log.user?.email ?? ''}</p>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 font-mono max-w-50 truncate">
                    {log.details ? JSON.stringify(log.details) : '—'}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">{log.ipAddress ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {logs.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <ClipboardList size={32} className="mx-auto mb-2 opacity-40" />
              <p>No audit logs yet</p>
            </div>
          )}
        </div>
        {pagination && pagination.totalPages > 1 && (
          <Pagination pagination={pagination} onPageChange={setPage} />
        )}
      </div>
    </div>
  )
}
