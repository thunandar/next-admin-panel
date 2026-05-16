'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { productsApi, categoriesApi, vendorsApi } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/utils'
import Button, { IconBtn } from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import Switch from '@/components/ui/Switch'
import { I } from '@/components/ui/Icons'
import type { Category, Vendor } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(2000).optional(),
  price: z.coerce.number().positive('Price must be greater than 0'),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative'),
  categoryId: z.string().optional(),
  vendorId: z.string().optional(),
  compareAtPrice: z.string().optional(),
  costPerItem: z.string().optional(),
  slug: z.string().optional(),
  metaTitle: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const selectStyle: React.CSSProperties = {
  height: 38,
  width: '100%',
  borderRadius: 10,
  border: '1px solid var(--line-2)',
  background: 'var(--bg-elev)',
  color: 'var(--ink)',
  fontSize: 14,
  padding: '0 12px',
  outline: 'none',
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 120,
  padding: 12,
  borderRadius: 10,
  border: '1px solid var(--line-2)',
  background: 'var(--bg-elev)',
  color: 'var(--ink)',
  fontSize: 14,
  lineHeight: 1.5,
  resize: 'vertical',
  outline: 'none',
  fontFamily: 'var(--sans)',
}

export default function NewProductPage() {
  const router = useRouter()
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [trackInventory, setTrackInventory] = useState(true)
  const [continueSelling, setContinueSelling] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)
  const [isFeatured, setIsFeatured] = useState(false)
  const [featuredOrder, setFeaturedOrder] = useState(0)
  const [submitMode, setSubmitMode] = useState<'active' | 'draft'>('active')
  const previewsRef = useRef<string[]>([])

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(() => {})
    vendorsApi.list({ status: 'active' }).then(setVendors).catch(() => {})
  }, [])

  useEffect(() => { previewsRef.current = previews }, [previews])
  useEffect(() => { return () => { previewsRef.current.forEach(URL.revokeObjectURL) } }, [])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { name: '', description: '', categoryId: '', vendorId: '', slug: '', metaTitle: '' },
  })

  const name = watch('name')
  const price = watch('price')
  const cost = watch('costPerItem')
  const compareAt = watch('compareAtPrice')
  const stock = watch('stock')

  useEffect(() => {
    if (!slugTouched && name) setValue('slug', slugify(name))
  }, [name, slugTouched, setValue])

  const margin = useMemo(() => {
    const p = Number(price)
    const c = Number(cost)
    if (!p || !c || c > p) return null
    const profit = p - c
    return { pct: (profit / p) * 100, profit }
  }, [price, cost])

  const compareAtDiscount = useMemo(() => {
    const p = Number(price)
    const ca = Number(compareAt)
    if (!p || !ca || ca <= p) return null
    return Math.round(((ca - p) / ca) * 100)
  }, [price, compareAt])

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remaining = 5 - images.length
    const selected = files.slice(0, remaining)
    setImages(prev => [...prev, ...selected])
    setPreviews(prev => [...prev, ...selected.map(f => URL.createObjectURL(f))])
  }

  const removeImage = (i: number) => {
    const url = previews[i]
    if (url) URL.revokeObjectURL(url)
    setImages(prev => prev.filter((_, idx) => idx !== i))
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const onSubmit = async (data: FormValues) => {
    try {
      const payload: Record<string, unknown> = {
        name: data.name,
        description: data.description || undefined,
        price: data.price,
        stock: data.stock,
        categoryId: data.categoryId ? Number(data.categoryId) : null,
        vendorId: data.vendorId ? Number(data.vendorId) : null,
        compareAtPrice: data.compareAtPrice ? Number(data.compareAtPrice) : undefined,
        costPerItem: data.costPerItem ? Number(data.costPerItem) : undefined,
        slug: data.slug || undefined,
        metaTitle: data.metaTitle || undefined,
        trackInventory,
        continueSelling,
        isFeatured,
        featuredOrder,
        status: submitMode,
      }
      await productsApi.create(
        payload as unknown as Parameters<typeof productsApi.create>[0],
        images.length ? images : undefined,
      )
      toast.success(submitMode === 'draft' ? 'Saved as draft' : 'Product created')
      router.push('/admin/products')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to create product'))
    }
  }

  const onDiscard = () => {
    if (!name && images.length === 0) return router.push('/admin/products')
    if (confirm('Discard this product?')) router.push('/admin/products')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1280, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Link href="/admin/products" aria-label="Back to products">
                <IconBtn icon={<I.chev_l />} variant="bordered" size={28} />
              </Link>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Products / New
              </span>
              <Badge tone={submitMode === 'active' ? 'success' : 'neutral'} dot size="sm">
                {submitMode === 'active' ? 'Active' : 'Draft'}
              </Badge>
            </div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 36, color: 'var(--ink)', lineHeight: 1.1, margin: 0, fontWeight: 400 }}>
              {name || 'Untitled product'}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="button" variant="ghost" size="sm" onClick={onDiscard}>Discard</Button>
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              loading={isSubmitting && submitMode === 'draft'}
              disabled={isSubmitting && submitMode !== 'draft'}
              onClick={() => setSubmitMode('draft')}
            >
              Save as draft
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<I.check />}
              loading={isSubmitting && submitMode === 'active'}
              disabled={isSubmitting && submitMode !== 'active'}
              onClick={() => setSubmitMode('active')}
            >
              Publish
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 20 }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* General */}
            <Card>
              <div style={{ marginBottom: 4, fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>General</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>The basics shown on the product page.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label="Title" required error={errors.name?.message}>
                  <Input {...register('name')} placeholder="e.g. Linen Field Shirt" />
                </Field>
                <Field label="Description" hint="Plain text. Markdown supported.">
                  <textarea
                    {...register('description')}
                    rows={4}
                    style={textareaStyle}
                    placeholder="Describe the product…"
                  />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                  <Field label="Category">
                    <select {...register('categoryId')} style={selectStyle}>
                      <option value="">No category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Vendor" hint={vendors.length === 0 ? 'No vendors yet — create one in Vendors.' : undefined}>
                    <select {...register('vendorId')} style={selectStyle}>
                      <option value="">No vendor</option>
                      {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </Field>
                </div>
              </div>
            </Card>

            {/* Media */}
            <Card>
              <div style={{ marginBottom: 4, fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>Media</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>The first image is used as the primary thumbnail.</div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {previews.map((src, i) => (
                  <div key={i} style={{ position: 'relative', height: 140, borderRadius: 12, overflow: 'hidden', background: 'var(--bg-muted)', border: i === 0 ? '2px solid var(--ink)' : '1px solid var(--line)' }}>
                    <Image src={src} alt={`preview-${i}`} fill style={{ objectFit: 'cover' }} sizes="200px" />
                    <button
                      type="button"
                      aria-label={`Remove image ${i + 1}`}
                      onClick={() => removeImage(i)}
                      style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 999, background: 'var(--ink)', color: 'var(--bg)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <I.x size={12} />
                    </button>
                    {i === 0 && (
                      <span style={{ position: 'absolute', bottom: 6, left: 6, background: 'var(--ink)', color: 'var(--bg)', fontSize: 10, padding: '2px 8px', borderRadius: 999, letterSpacing: 0.3 }}>
                        primary
                      </span>
                    )}
                  </div>
                ))}

                {images.length < 5 && (
                  <label style={{ height: 140, borderRadius: 12, border: '1.5px dashed var(--line-strong)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--ink-3)', cursor: 'pointer', background: 'var(--bg)' }}>
                    <I.upload size={20} />
                    <span style={{ fontSize: 12 }}>Upload</span>
                    <input type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleImages} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 10 }}>
                JPEG, PNG, WebP up to 5MB — max 5 images
              </div>
            </Card>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Pricing */}
            <Card>
              <div style={{ marginBottom: 16, fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>Pricing</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12, marginBottom: 12 }}>
                <Field label="Price" required error={errors.price?.message}>
                  <Input type="number" step="0.01" min="0" inputMode="decimal" icon={<span style={{ color: 'var(--ink-3)' }}>$</span>} {...register('price')} />
                </Field>
                <Field label="Compare-at">
                  <Input type="number" step="0.01" min="0" inputMode="decimal" icon={<span style={{ color: 'var(--ink-3)' }}>$</span>} {...register('compareAtPrice')} />
                </Field>
              </div>
              <Field label="Cost per item" hint="Customers won't see this">
                <Input type="number" step="0.01" min="0" inputMode="decimal" icon={<span style={{ color: 'var(--ink-3)' }}>$</span>} {...register('costPerItem')} />
              </Field>

              {margin && (
                <div style={{ padding: 12, background: 'var(--sage-tint)', borderRadius: 8, fontSize: 12, color: 'var(--sage-2)', marginTop: 12 }}>
                  Margin <strong style={{ fontWeight: 600 }}>{margin.pct.toFixed(1)}%</strong> · Profit{' '}
                  <strong style={{ fontWeight: 600 }}>${margin.profit.toFixed(2)}</strong>
                </div>
              )}
              {compareAtDiscount && (
                <div style={{ padding: 12, background: 'var(--terracotta-tint)', borderRadius: 8, fontSize: 12, color: 'var(--terracotta-2)', marginTop: 8 }}>
                  On sale · <strong style={{ fontWeight: 600 }}>{compareAtDiscount}% off</strong> compare-at price
                </div>
              )}
            </Card>

            {/* Inventory */}
            <Card>
              <div style={{ marginBottom: 16, fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>Inventory</div>
              <Field label="Stock on hand" required error={errors.stock?.message}>
                <Input type="number" min="0" inputMode="numeric" {...register('stock')} />
              </Field>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', marginTop: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Track inventory</span>
                <Switch checked={trackInventory} onChange={setTrackInventory} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Continue selling when out</span>
                <Switch checked={continueSelling} onChange={setContinueSelling} />
              </div>
              <div style={{ height: 1, background: 'var(--line)', margin: '12px 0' }} />
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Total in stock</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--ink)', lineHeight: 1.1, marginTop: 2 }}>
                {Number(stock) || 0}{' '}
                <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-3)' }}>units</span>
              </div>
            </Card>

            {/* Storefront */}
            <Card>
              <div style={{ marginBottom: 4, fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>Storefront</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>
                Featured products appear in the home page hero slider.
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Feature on home</span>
                <Switch checked={isFeatured} onChange={setIsFeatured} />
              </div>
              {isFeatured && (
                <div style={{ marginTop: 8 }}>
                  <Field label="Slider order" hint="Lower numbers appear first.">
                    <Input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={featuredOrder}
                      onChange={(e) => setFeaturedOrder(Number(e.target.value) || 0)}
                    />
                  </Field>
                </div>
              )}
            </Card>

            {/* SEO */}
            <Card>
              <div style={{ marginBottom: 12, fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>SEO</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label="Slug" hint="Auto-generated from title.">
                  <Input {...register('slug')} onFocus={() => setSlugTouched(true)} />
                </Field>
                <Field label="Meta title">
                  <Input {...register('metaTitle')} placeholder="e.g. Linen Field Shirt — Nexus" />
                </Field>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </form>
  )
}
