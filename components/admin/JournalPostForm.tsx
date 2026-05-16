'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { journalApi, type JournalPost } from '@/lib/api'
import { getApiErrorMessage, getImageUrl } from '@/lib/utils'
import Button, { IconBtn } from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import Switch from '@/components/ui/Switch'
import { I } from '@/components/ui/Icons'

const schema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  slug: z.string().optional(),
  eyebrow: z.string().max(80).optional(),
  excerpt: z.string().max(400).optional(),
  body: z.string().min(1, 'Body is required'),
  author: z.string().max(80).optional(),
})

type FormValues = z.infer<typeof schema>

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: 12,
  borderRadius: 10,
  border: '1px solid var(--line-2)',
  background: 'var(--bg-elev)',
  color: 'var(--ink)',
  fontSize: 14,
  lineHeight: 1.6,
  resize: 'vertical',
  outline: 'none',
  fontFamily: 'var(--sans)',
}

interface Props {
  mode: 'new' | 'edit'
  initial?: JournalPost
}

export default function JournalPostForm({ mode, initial }: Props) {
  const router = useRouter()
  const [cover, setCover] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(
    initial?.coverImageUrl ? getImageUrl(initial.coverImageUrl) : null,
  )
  const [published, setPublished] = useState(initial?.published ?? false)
  const [slugTouched, setSlugTouched] = useState(mode === 'edit')
  const previewRef = useRef<string | null>(null)

  useEffect(() => { previewRef.current = coverPreview }, [coverPreview])
  useEffect(() => () => {
    const url = previewRef.current
    if (url && url.startsWith('blob:')) URL.revokeObjectURL(url)
  }, [])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      title: initial?.title ?? '',
      slug: initial?.slug ?? '',
      eyebrow: initial?.eyebrow ?? '',
      excerpt: initial?.excerpt ?? '',
      body: initial?.body ?? '',
      author: initial?.author ?? '',
    },
  })

  const title = watch('title')

  useEffect(() => {
    if (!slugTouched && title) setValue('slug', slugify(title))
  }, [title, slugTouched, setValue])

  const handleCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (coverPreview && coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview)
    setCover(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const removeCover = () => {
    if (coverPreview && coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview)
    setCover(null)
    setCoverPreview(null)
  }

  const onSubmit = async (data: FormValues) => {
    try {
      const payload: Partial<JournalPost> = {
        title: data.title,
        slug: data.slug || slugify(data.title),
        eyebrow: data.eyebrow || null,
        excerpt: data.excerpt || null,
        body: data.body,
        author: data.author || null,
        published,
      }
      if (mode === 'new') {
        await journalApi.create(payload, cover)
        toast.success('Post created')
      } else if (initial) {
        await journalApi.update(initial.id, payload, cover)
        toast.success('Post updated')
      }
      router.push('/admin/journal')
    } catch (err) {
      toast.error(getApiErrorMessage(err, mode === 'new' ? 'Failed to create post' : 'Failed to update post'))
    }
  }

  const onDiscard = () => {
    if (mode === 'new' && !title && !cover) return router.push('/admin/journal')
    if (confirm(mode === 'new' ? 'Discard this post?' : 'Discard your changes?')) {
      router.push('/admin/journal')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1280, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Link href="/admin/journal" aria-label="Back to journal">
                <IconBtn icon={<I.chev_l />} variant="bordered" size={28} />
              </Link>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Journal / {mode === 'new' ? 'New' : 'Edit'}
              </span>
              {published ? (
                <Badge tone="success" dot size="sm">Published</Badge>
              ) : (
                <Badge tone="neutral" dot size="sm">Draft</Badge>
              )}
            </div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 36, color: 'var(--ink)', lineHeight: 1.1, margin: 0, fontWeight: 400 }}>
              {title || (mode === 'new' ? 'Untitled post' : initial?.title)}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="button" variant="ghost" size="sm" onClick={onDiscard}>Discard</Button>
            <Button type="submit" variant="primary" size="sm" icon={<I.check />} loading={isSubmitting}>
              {mode === 'new' ? 'Create post' : 'Save changes'}
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 20 }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Content */}
            <Card>
              <div style={{ marginBottom: 4, fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>Content</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>The story shown on the journal page.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label="Eyebrow" hint="Small label above the title (e.g., Field notes).">
                  <Input {...register('eyebrow')} placeholder="e.g. Field notes" />
                </Field>
                <Field label="Title" required error={errors.title?.message}>
                  <Input {...register('title')} placeholder="e.g. The quiet luxury of natural fibres" />
                </Field>
                <Field label="Excerpt" hint="One or two sentences shown on the listing.">
                  <textarea
                    {...register('excerpt')}
                    rows={3}
                    style={{ ...textareaStyle, minHeight: 80 }}
                    placeholder="A short teaser for the post…"
                  />
                </Field>
                <Field label="Body" required error={errors.body?.message} hint="Plain text. Blank lines start new paragraphs.">
                  <textarea
                    {...register('body')}
                    rows={18}
                    style={{ ...textareaStyle, minHeight: 380 }}
                    placeholder="Write the post…"
                  />
                </Field>
              </div>
            </Card>

            {/* Cover */}
            <Card>
              <div style={{ marginBottom: 4, fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>Cover image</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>Used as the hero on the post and the thumbnail on the journal index.</div>

              {coverPreview ? (
                <div style={{ position: 'relative', height: 280, borderRadius: 12, overflow: 'hidden', background: 'var(--bg-muted)', border: '1px solid var(--line)' }}>
                  <Image src={coverPreview} alt="cover" fill style={{ objectFit: 'cover' }} sizes="800px" />
                  <button
                    type="button"
                    aria-label="Remove cover"
                    onClick={removeCover}
                    style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 999, background: 'var(--ink)', color: 'var(--bg)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <I.x size={14} />
                  </button>
                </div>
              ) : (
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, height: 200, borderRadius: 12, border: '1.5px dashed var(--line-strong)', color: 'var(--ink-3)', cursor: 'pointer', background: 'var(--bg)' }}>
                  <I.upload size={22} />
                  <span style={{ fontSize: 13 }}>Upload cover image</span>
                  <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleCover} style={{ display: 'none' }} />
                </label>
              )}
              <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 10 }}>
                JPEG, PNG, WebP up to 5MB
              </div>
            </Card>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Visibility */}
            <Card>
              <div style={{ marginBottom: 16, fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>Visibility</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>Published</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Visible on the storefront journal.</div>
                </div>
                <Switch checked={published} onChange={setPublished} />
              </div>
              {initial?.publishedAt && (
                <>
                  <div style={{ height: 1, background: 'var(--line)', margin: '12px 0' }} />
                  <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>First published</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>
                    {new Date(initial.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </>
              )}
            </Card>

            {/* Byline + slug */}
            <Card>
              <div style={{ marginBottom: 12, fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>Byline</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label="Author">
                  <Input {...register('author')} placeholder="e.g. Lena Marquez" />
                </Field>
              </div>
            </Card>

            <Card>
              <div style={{ marginBottom: 12, fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>SEO</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label="Slug" hint="Auto-generated from title.">
                  <Input {...register('slug')} onFocus={() => setSlugTouched(true)} />
                </Field>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </form>
  )
}
