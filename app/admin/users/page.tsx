'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, Trash2, Edit, Users as UsersIcon, Shield, UserCheck, UserPlus, Crown } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'
import { usersApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Pagination from '@/components/ui/Pagination'
import { ConfirmModal } from '@/components/ui/Modal'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/Spinner'
import type { Pagination as PaginationType, User } from '@/types'

function RoleBadge({ role }: { role: User['role'] }) {
  if (role === 'super_admin') return (
    <div className="flex items-center gap-1.5">
      <Crown size={14} className="text-amber-500" />
      <Badge variant="yellow" className="capitalize">Super Admin</Badge>
    </div>
  )
  if (role === 'admin') return (
    <div className="flex items-center gap-1.5">
      <Shield size={14} className="text-purple-500" />
      <Badge variant="purple" className="capitalize">Admin</Badge>
    </div>
  )
  return (
    <div className="flex items-center gap-1.5">
      <UserCheck size={14} className="text-blue-500" />
      <Badge variant="blue" className="capitalize">User</Badge>
    </div>
  )
}

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const isSuperAdmin = currentUser?.role === 'super_admin'

  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<PaginationType | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '' })
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'user' })
  const [creating, setCreating] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await usersApi.getAll({
        page,
        limit: 10,
        search: search || undefined,
        role: roleFilter as User['role'] | undefined || undefined,
      })
      setUsers(res.data)
      setPagination(res.pagination)
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [page, search, roleFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      await usersApi.create({
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        role: createForm.role as User['role'],
      })
      toast.success('User created')
      setShowCreate(false)
      setCreateForm({ name: '', email: '', password: '', role: 'user' })
      fetchUsers()
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? err.response?.data?.message ?? 'Failed to create user' : 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  const openEdit = (user: User) => {
    setEditTarget(user)
    setEditForm({ name: user.name, email: user.email, role: user.role })
  }

  const handleSave = async () => {
    if (!editTarget) return
    setSaving(true)
    try {
      await usersApi.update(editTarget.id, {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role as User['role'],
      })
      toast.success('User updated')
      setEditTarget(null)
      fetchUsers()
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? err.response?.data?.message ?? 'Failed to update user' : 'Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await usersApi.delete(deleteTarget.id)
      toast.success('User deleted')
      setDeleteTarget(null)
      fetchUsers()
    } catch {
      toast.error('Failed to delete user')
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
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-[#38444d] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#253341] dark:text-white dark:placeholder-[#8b98a5]"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">Search</Button>
          {search && (
            <Button type="button" variant="ghost" size="sm" onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}>
              Clear
            </Button>
          )}
        </form>

        <div className="flex gap-2">
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-[#38444d] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#253341] dark:text-white"
          >
            <option value="">All roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
          {isSuperAdmin && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <UserPlus size={16} />
              Add User
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1e2732] rounded-xl shadow-sm border border-gray-100 dark:border-[#38444d] overflow-hidden">
        {loading ? (
          <PageLoader />
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <UsersIcon size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No users found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#253341] border-b border-gray-100 dark:border-[#38444d]">
                    <th className="text-left text-xs font-semibold text-gray-500 dark:text-[#8b98a5] uppercase tracking-wider px-6 py-3">User</th>
                    <th className="text-left text-xs font-semibold text-gray-500 dark:text-[#8b98a5] uppercase tracking-wider px-6 py-3">Role</th>
                    <th className="text-left text-xs font-semibold text-gray-500 dark:text-[#8b98a5] uppercase tracking-wider px-6 py-3">Joined</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-[#253341]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-[#253341] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                              {u.name}
                              {u.id === currentUser?.id && (
                                <Badge variant="blue">You</Badge>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-[#8b98a5]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-[#8b98a5]">{formatDate(u.createdAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                          >
                            <Edit size={15} />
                          </button>
                          {isSuperAdmin && u.id !== currentUser?.id && (
                            <button
                              onClick={() => setDeleteTarget(u)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
          </>
        )}
      </div>

      {/* Create Modal — super_admin only */}
      {isSuperAdmin && (
        <Modal open={showCreate} title="Add User" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <Input label="Name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Full name" />
            <Input label="Email" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="email@example.com" />
            <Input label="Password" type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Min 6 characters" />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-[#8b98a5]">Role</label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#38444d] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#253341] dark:text-white"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</Button>
              <Button onClick={handleCreate} loading={creating}>Create User</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      <Modal open={!!editTarget} title="Edit User" onClose={() => setEditTarget(null)}>
        <div className="space-y-4">
          <Input label="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <Input label="Email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-[#8b98a5]">Role</label>
            <select
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              disabled={!isSuperAdmin}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#38444d] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#253341] dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              {isSuperAdmin && <option value="super_admin">Super Admin</option>}
            </select>
            {!isSuperAdmin && (
              <p className="text-xs text-gray-400 dark:text-[#8b98a5] mt-1">Only super admins can change roles.</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditTarget(null)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete User"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
