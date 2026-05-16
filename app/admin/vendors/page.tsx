'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { vendorsApi } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/utils'
import Button, { IconBtn } from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import SectionHead from '@/components/ui/SectionHead'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/Modal'
import { I } from '@/components/ui/Icons'
import type { Vendor } from '@/types'

const TH_STYLE: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 16px',
  fontSize: 11.5,
  fontWeight: 500,
  color: 'var(--ink-3)',
  textTransform: 'uppercase',
  letterSpacing: 0.04,
}

const FILTERS: Array<{ value: '' | 'active' | 'inactive'; label: string }> = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('')
  const [deleting, setDeleting] = useState<Vendor | null>(null)
  const [working, setWorking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setVendors(await vendorsApi.list())
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load vendors'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return vendors.filter((v) => {
      if (statusFilter && v.status !== statusFilter) return false
      if (!q) return true
      return v.name.toLowerCase().includes(q) || v.slug.toLowerCase().includes(q)
    })
  }, [vendors, search, statusFilter])

  const confirmDelete = async () => {
    if (!deleting) return
    setWorking(true)
    try {
      await vendorsApi.remove(deleting.id)
      toast.success('Vendor deleted')
      await load()
      setDeleting(null)
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete vendor'))
    } finally {
      setWorking(false)
    }
  }

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHead
        title="Vendors"
        sub={`${vendors.length} ${vendors.length === 1 ? 'vendor' : 'vendors'}. Used in the storefront marquee and on every product.`}
        right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Input
              inputSize="sm"
              icon={<I.search />}
              placeholder="Search vendors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              full={false}
            />
            <Link href="/admin/vendors/new">
              <Button variant="primary" size="sm" icon={<I.plus />}>
                New vendor
              </Button>
            </Link>
          </div>
        }
      />

      <div style={{ display: 'flex', gap: 6 }}>
        {FILTERS.map((f) => (
          <button
            key={f.value || 'all'}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              border: '1px solid',
              borderColor: statusFilter === f.value ? 'var(--ink)' : 'var(--line)',
              background: statusFilter === f.value ? 'var(--ink)' : 'var(--bg-elev)',
              color: statusFilter === f.value ? 'var(--bg)' : 'var(--ink-2)',
              fontSize: 12.5,
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card padding={0}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-muted)' }}>
                <th style={TH_STYLE}>Vendor</th>
                <th style={TH_STYLE}>Slug</th>
                <th style={TH_STYLE}>Status</th>
                <th style={TH_STYLE}>Website</th>
                <th style={{ ...TH_STYLE, textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)' }}>
                    Loading…
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)' }}>
                    No vendors yet. Create your first one.
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)' }}>
                    No vendors match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: 'var(--bg-muted)',
                            border: '1px solid var(--line)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            position: 'relative',
                            flexShrink: 0,
                          }}
                        >
                          {v.logoUrl ? (
                            <Image src={v.logoUrl} alt="" fill style={{ objectFit: 'contain' }} sizes="36px" />
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--serif)' }}>
                              {v.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div>
                          <div style={{ color: 'var(--ink)', fontWeight: 500 }}>{v.name}</div>
                          {v.description && (
                            <div
                              style={{
                                fontSize: 12,
                                color: 'var(--ink-3)',
                                marginTop: 2,
                                maxWidth: 360,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {v.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: 12.5 }}>
                      {v.slug}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge tone={v.status === 'active' ? 'success' : 'neutral'} dot size="sm">
                        {v.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--ink-3)' }}>
                      {v.websiteUrl ? (
                        <a
                          href={v.websiteUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          style={{ color: 'var(--terracotta-2)', textDecoration: 'none' }}
                        >
                          {v.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 4 }}>
                        <Link href={`/admin/vendors/${v.id}/edit`}>
                          <IconBtn icon={<I.edit />} variant="ghost" size={28} aria-label={`Edit ${v.name}`} />
                        </Link>
                        <IconBtn
                          icon={<I.trash />}
                          variant="ghost"
                          size={28}
                          aria-label={`Delete ${v.name}`}
                          onClick={() => setDeleting(v)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmModal
        open={deleting !== null}
        title="Delete vendor?"
        message={
          deleting
            ? `Delete "${deleting.name}"? Products from this vendor will lose their vendor reference but will not be deleted.`
            : ''
        }
        confirmLabel="Delete"
        loading={working}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
