'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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

const SHOP_URL = process.env.NEXT_PUBLIC_SHOP_URL || 'http://localhost:3000'

const META_LABEL: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--ink-3)',
  textTransform: 'uppercase',
  letterSpacing: 0.06,
  marginBottom: 4,
}

const META_VALUE: React.CSSProperties = {
  fontSize: 13.5,
  color: 'var(--ink)',
  wordBreak: 'break-word',
}

export default function JournalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [post, setPost] = useState<JournalPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!id) return
    journalApi
      .getById(Number(id))
      .then(setPost)
      .catch((err) => toast.error(getApiErrorMessage(err, 'Failed to load post')))
      .finally(() => setLoading(false))
  }, [id])

  const paragraphs = useMemo(
    () => (post?.body ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
    [post?.body],
  )

  const handleDelete = async () => {
    if (!post) return
    setBusy(true)
    try {
      await journalApi.remove(post.id)
      toast.success('Post deleted')
      router.push('/admin/journal')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete'))
      setBusy(false)
    }
  }

  if (loading) return <PageLoader />

  if (!post) {
    return (
      <div style={{ padding: 64, textAlign: 'center', color: 'var(--ink-3)' }}>
        <p style={{ marginBottom: 16 }}>Post not found.</p>
        <Link href="/admin/journal">
          <Button variant="secondary" size="sm">Back to journal</Button>
        </Link>
      </div>
    )
  }

  const storefrontUrl = `${SHOP_URL}/shop/journal/${post.slug}`

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Link href="/admin/journal" aria-label="Back to journal">
              <IconBtn icon={<I.chev_l />} variant="bordered" size={28} />
            </Link>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Journal / Detail
            </span>
            {post.published ? (
              <Badge tone="success" dot size="sm">Published</Badge>
            ) : (
              <Badge tone="neutral" dot size="sm">Draft</Badge>
            )}
          </div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 36, color: 'var(--ink)', lineHeight: 1.1, margin: 0, fontWeight: 400 }}>
            {post.title}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {post.published && (
            <a href={storefrontUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" icon={<I.external />}>View on storefront</Button>
            </a>
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={<I.trash />}
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </Button>
          <Link href={`/admin/journal/${post.id}/edit`}>
            <Button variant="primary" size="sm" icon={<I.edit />}>Edit</Button>
          </Link>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 20 }}>
        {/* Left: preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <div style={{ marginBottom: 4, fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>Preview</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 20 }}>How the post appears on the storefront.</div>

            {post.coverImageUrl ? (
              <div style={{ position: 'relative', aspectRatio: '16 / 9', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-muted)', marginBottom: 28, border: '1px solid var(--line)' }}>
                <Image
                  src={getImageUrl(post.coverImageUrl)}
                  alt={post.title}
                  fill
                  sizes="800px"
                  style={{ objectFit: 'cover' }}
                />
              </div>
            ) : (
              <div style={{ height: 220, borderRadius: 12, background: 'var(--bg-muted)', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-4)', fontSize: 13, border: '1px dashed var(--line-strong)' }}>
                No cover image
              </div>
            )}

            <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', paddingBottom: 24 }}>
              <div style={{ fontSize: 11, color: 'var(--terracotta-2)', textTransform: 'uppercase', letterSpacing: 0.08, marginBottom: 12 }}>
                {post.eyebrow || 'Field notes'}
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 32, lineHeight: 1.1, color: 'var(--ink)', fontWeight: 400 }}>
                {post.title}
              </div>
              {post.excerpt && (
                <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 17, lineHeight: 1.5, color: 'var(--ink-2)', marginTop: 14 }}>
                  {post.excerpt}
                </div>
              )}
              <div style={{ marginTop: 20, fontSize: 11.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.08 }}>
                {post.author && <span>{post.author}</span>}
                {post.author && (post.publishedAt || post.createdAt) && <span style={{ opacity: 0.4, margin: '0 8px' }}>·</span>}
                <span>{formatDate(post.publishedAt || post.createdAt)}</span>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--line)', margin: '8px 0 28px' }} />

            <div
              style={{
                maxWidth: 640,
                margin: '0 auto',
                fontFamily: 'var(--serif)',
                fontSize: 17,
                lineHeight: 1.75,
                color: 'var(--ink-2)',
              }}
            >
              {paragraphs.length === 0 ? (
                <p style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>No body yet.</p>
              ) : (
                paragraphs.map((p, i) => (
                  <p key={i} style={{ margin: i === 0 ? 0 : '1.1em 0 0' }}>
                    {p}
                  </p>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right: metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <div style={{ marginBottom: 16, fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>Metadata</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={META_LABEL}>Status</div>
                {post.published ? (
                  <Badge tone="success" dot size="sm">Published</Badge>
                ) : (
                  <Badge tone="neutral" dot size="sm">Draft</Badge>
                )}
              </div>
              <div>
                <div style={META_LABEL}>Slug</div>
                <div style={{ ...META_VALUE, fontFamily: 'var(--mono)', fontSize: 12.5 }}>/{post.slug}</div>
              </div>
              <div>
                <div style={META_LABEL}>Author</div>
                <div style={META_VALUE}>{post.author || <span style={{ color: 'var(--ink-3)' }}>—</span>}</div>
              </div>
              <div>
                <div style={META_LABEL}>First published</div>
                <div style={META_VALUE}>
                  {post.publishedAt ? formatDate(post.publishedAt) : <span style={{ color: 'var(--ink-3)' }}>Never</span>}
                </div>
              </div>
              <div>
                <div style={META_LABEL}>Created</div>
                <div style={META_VALUE}>{formatDate(post.createdAt)}</div>
              </div>
              <div>
                <div style={META_LABEL}>Last updated</div>
                <div style={META_VALUE}>{formatDate(post.updatedAt)}</div>
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ marginBottom: 12, fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>Storefront URL</div>
            {post.published ? (
              <>
                <a
                  href={storefrontUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    fontSize: 12.5,
                    color: 'var(--ink-2)',
                    fontFamily: 'var(--mono)',
                    wordBreak: 'break-all',
                    textDecoration: 'underline',
                    textDecorationColor: 'var(--line-strong)',
                    textUnderlineOffset: 3,
                  }}
                >
                  {storefrontUrl}
                </a>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 8 }}>
                  Visible to readers.
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
                Publish the post to make it visible at this URL.
              </div>
            )}
          </Card>
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        title="Delete journal post"
        message={`Are you sure you want to delete "${post.title}"? This cannot be undone.`}
        loading={busy}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}
