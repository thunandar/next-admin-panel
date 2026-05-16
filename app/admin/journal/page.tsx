'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { journalApi, type JournalPost } from '@/lib/api'
import { getApiErrorMessage, formatDate, getImageUrl } from '@/lib/utils'
import Button, { IconBtn } from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/Spinner'
import { I } from '@/components/ui/Icons'

const TH: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 16px',
  fontSize: 11.5,
  fontWeight: 500,
  color: 'var(--ink-3)',
  textTransform: 'uppercase',
  letterSpacing: 0.04,
}

const TD: React.CSSProperties = {
  padding: '14px 16px',
  borderTop: '1px solid var(--line)',
  fontSize: 13.5,
  color: 'var(--ink)',
  verticalAlign: 'middle',
}

export default function JournalListPage() {
  const [posts, setPosts] = useState<JournalPost[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<JournalPost | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await journalApi.list(1, 50, true)
      setPosts(result.posts)
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load journal posts'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await journalApi.remove(deleting.id)
      toast.success('Post deleted')
      setDeleting(null)
      await load()
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Journal
          </span>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 32, color: 'var(--ink)', lineHeight: 1.1, margin: '6px 0 0', fontWeight: 400 }}>
            Editorial posts
          </h1>
        </div>
        <Link href="/admin/journal/new">
          <Button variant="primary" size="sm" icon={<I.plus />}>New post</Button>
        </Link>
      </div>

      <Card padding={0}>
        {posts.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center', color: 'var(--ink-3)' }}>
            <p style={{ marginBottom: 12 }}>No journal posts yet.</p>
            <Link href="/admin/journal/new">
              <Button variant="secondary" size="sm">Write your first post</Button>
            </Link>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--bg-muted)' }}>
              <tr>
                <th style={TH}>Cover</th>
                <th style={TH}>Title</th>
                <th style={TH}>Author</th>
                <th style={TH}>Status</th>
                <th style={TH}>Updated</th>
                <th style={{ ...TH, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td style={TD}>
                    <div style={{ width: 56, height: 40, borderRadius: 6, overflow: 'hidden', background: 'var(--bg-muted)', position: 'relative' }}>
                      {p.coverImageUrl ? (
                        <Image src={getImageUrl(p.coverImageUrl)} alt="" fill sizes="56px" style={{ objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-4)' }}>
                          <I.box size={16} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={TD}>
                    <div style={{ fontWeight: 500 }}>{p.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>/{p.slug}</div>
                  </td>
                  <td style={TD}>{p.author || '—'}</td>
                  <td style={TD}>
                    {p.published ? (
                      <Badge tone="success" dot size="sm">Published</Badge>
                    ) : (
                      <Badge tone="neutral" dot size="sm">Draft</Badge>
                    )}
                  </td>
                  <td style={{ ...TD, color: 'var(--ink-3)' }}>{formatDate(p.updatedAt)}</td>
                  <td style={{ ...TD, textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <Link href={`/admin/journal/${p.id}`} aria-label="View post">
                        <IconBtn icon={<I.eye />} variant="ghost" size={32} />
                      </Link>
                      <Link href={`/admin/journal/${p.id}/edit`} aria-label="Edit post">
                        <IconBtn icon={<I.edit />} variant="ghost" size={32} />
                      </Link>
                      <IconBtn
                        icon={<I.trash />}
                        variant="ghost"
                        size={32}
                        aria-label="Delete post"
                        onClick={() => setDeleting(p)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <ConfirmModal
        open={!!deleting}
        title="Delete journal post"
        message={`Are you sure you want to delete "${deleting?.title}"? This cannot be undone.`}
        loading={busy}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
