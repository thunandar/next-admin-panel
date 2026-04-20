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
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setFetchError(false)
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
      .catch(() => { toast.error('Failed to load audit logs'); setFetchError(true) })
      .finally(() => setLoading(false))
  }, [page, entity])

  if (loading) return <PageLoader />
  if (fetchError) return (
    <div className="text-center py-24 text-gray-400">
      <p className="text-lg font-medium">Failed to load audit logs</p>
      <p className="text-sm mt-1">Check your connection and try refreshing.</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
        <select
          value={entity}
          onChange={e => { setEntity(e.target.value); setPage(1) }}
          className="text-sm border border-gray-200 dark:border-[#38444d] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#253341] dark:text-white"
        >
          <option value="">All Entities</option>
          {['product', 'user', 'order'].map(e => (
            <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-[#1e2732] rounded-xl shadow-sm border border-gray-100 dark:border-[#38444d] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#253341] border-b border-gray-100 dark:border-[#38444d]">
                <th scope="col" className="text-left text-xs font-semibold text-gray-500 dark:text-[#8b98a5] uppercase tracking-wider px-6 py-3">Action</th>
                <th scope="col" className="text-left text-xs font-semibold text-gray-500 dark:text-[#8b98a5] uppercase tracking-wider px-6 py-3">Entity</th>
                <th scope="col" className="text-left text-xs font-semibold text-gray-500 dark:text-[#8b98a5] uppercase tracking-wider px-6 py-3">User</th>
                <th scope="col" className="text-left text-xs font-semibold text-gray-500 dark:text-[#8b98a5] uppercase tracking-wider px-6 py-3">Details</th>
                <th scope="col" className="text-left text-xs font-semibold text-gray-500 dark:text-[#8b98a5] uppercase tracking-wider px-6 py-3">IP</th>
                <th scope="col" className="text-left text-xs font-semibold text-gray-500 dark:text-[#8b98a5] uppercase tracking-wider px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#253341]">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-[#253341] transition-colors">
                  <td className="px-6 py-4">
                    <Badge variant={ACTION_VARIANT[log.action] ?? 'gray'}>{log.action}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-[#8b98a5]">
                    {log.entity} {log.entityId ? `#${log.entityId}` : ''}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900 dark:text-white">{log.user?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400 dark:text-[#8b98a5]">{log.user?.email ?? ''}</p>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 dark:text-[#8b98a5] font-mono max-w-50 truncate">
                    {log.details ? JSON.stringify(log.details) : '—'}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400 dark:text-[#8b98a5]">{log.ipAddress ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-[#8b98a5]">{formatDate(log.createdAt)}</td>
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
