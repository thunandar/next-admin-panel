'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { productsApi, categoriesApi, vendorsApi, variantsApi } from '@/lib/api'
import { getApiErrorMessage, getImageUrl } from '@/lib/utils'
import Button, { IconBtn } from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import Switch from '@/components/ui/Switch'
import { I } from '@/components/ui/Icons'
import { PageLoader } from '@/components/ui/Spinner'
import { ConfirmModal } from '@/components/ui/Modal'
import VariantEditor from '@/components/admin/VariantEditor'
import type { Category, Product, ProductVariant, Vendor } from '@/types'

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

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  type Status = 'active' | 'draft' | 'archived'

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [newImages, setNewImages] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [trackInventory, setTrackInventory] = useState(true)
  const [continueSelling, setContinueSelling] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)
  const [isFeatured, setIsFeatured] = useState(false)
  const [featuredOrder, setFeaturedOrder] = useState(0)
  const [status, setStatus] = useState<Status>('active')
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null)
  const [deletingVariant, setDeletingVariant] = useState<ProductVariant | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const previewsRef = useRef<string[]>([])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
  })

  const price = watch('price')
  const compareAt = watch('compareAtPrice')
  const cost = watch('costPerItem')
  const name = watch('name')
  const stock = watch('stock')

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(() => {})
    vendorsApi.list({ status: 'active' }).then(setVendors).catch(() => {})
  }, [])

  useEffect(() => {
    productsApi
      .getById(Number(id))
      .then(({ data }) => {
        setProduct(data)
        setVariants(
          [...(data.variants ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
        )
        setIsFeatured(Boolean(data.isFeatured))
        setFeaturedOrder(Number(data.featuredOrder ?? 0))
        setTrackInventory(data.trackInventory ?? true)
        setContinueSelling(data.continueSelling ?? false)
        const raw = data.status
        setStatus(raw === 'draft' || raw === 'archived' ? raw : 'active')
        const toStr = (v: string | number | null | undefined) =>
          v === null || v === undefined || v === '' ? '' : String(v)
        reset({
          name: data.name,
          description: data.description || '',
          price: Number(data.price),
          stock: data.stock,
          categoryId: data.categoryId != null ? String(data.categoryId) : '',
          vendorId: data.vendorId != null ? String(data.vendorId) : '',
          compareAtPrice: toStr(data.compareAtPrice),
          costPerItem: toStr(data.costPerItem),
          slug: data.slug || slugify(data.name),
          metaTitle: data.metaTitle || `${data.name} — Nexus`,
        })
        if (data.slug) setSlugTouched(true)
      })
      .catch(() => { toast.error('Product not found'); setFetchError(true) })
      .finally(() => setLoading(false))
  }, [id, reset])

  useEffect(() => {
    if (!slugTouched && name) setValue('slug', slugify(name))
  }, [name, slugTouched, setValue])

  useEffect(() => { previewsRef.current = newPreviews }, [newPreviews])
  useEffect(() => { return () => { previewsRef.current.forEach(URL.revokeObjectURL) } }, [])

  const margin = useMemo(() => {
    const p = Number(price)
    const c = Number(cost)
    if (!p || !c || c > p) return null
    const profit = p - c
    const pct = (profit / p) * 100
    return { pct, profit }
  }, [price, cost])

  const compareAtDiscount = useMemo(() => {
    const p = Number(price)
    const ca = Number(compareAt)
    if (!p || !ca || ca <= p) return null
    return Math.round(((ca - p) / ca) * 100)
  }, [price, compareAt])

  const hasVariants = variants.length > 0
  const variantStockTotal = useMemo(
    () => variants.reduce((sum, v) => sum + (v.stock || 0), 0),
    [variants],
  )
  const variantPriceRange = useMemo(() => {
    if (!hasVariants) return null
    const fallback = Number(price) || 0
    const prices = variants.map((v) =>
      v.priceOverride != null && v.priceOverride !== '' ? Number(v.priceOverride) : fallback,
    )
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    return { min, max }
  }, [variants, hasVariants, price])

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setNewImages(prev => [...prev, ...files].slice(0, 5))
    setNewPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))].slice(0, 5))
  }

  const removeNew = (i: number) => {
    const url = newPreviews[i]
    if (url) URL.revokeObjectURL(url)
    setNewImages(p => p.filter((_, idx) => idx !== i))
    setNewPreviews(p => p.filter((_, idx) => idx !== i))
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
        status,
      }
      await productsApi.update(
        Number(id),
        payload as unknown as Parameters<typeof productsApi.update>[1],
        newImages.length ? newImages : undefined,
      )
      toast.success('Product updated')
      router.push('/admin/products')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update product'))
    }
  }

  const onDiscard = () => {
    if (!isDirty && newImages.length === 0) return router.push('/admin/products')
    if (confirm('Discard unsaved changes?')) router.push('/admin/products')
  }

  const sortVariants = (list: ProductVariant[]) =>
    [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)

  const openNewVariant = () => { setEditingVariant(null); setEditorOpen(true) }
  const openEditVariant = (v: ProductVariant) => { setEditingVariant(v); setEditorOpen(true) }

  const onVariantSaved = (saved: ProductVariant) => {
    setVariants((prev) => {
      const exists = prev.some((v) => v.id === saved.id)
      const next = exists ? prev.map((v) => (v.id === saved.id ? saved : v)) : [...prev, saved]
      return sortVariants(next)
    })
  }

  const onConfirmDelete = async () => {
    if (!deletingVariant || !id) return
    setDeletingBusy(true)
    try {
      await variantsApi.remove(Number(id), deletingVariant.id)
      setVariants((prev) => prev.filter((v) => v.id !== deletingVariant.id))
      toast.success('Variant deleted')
      setDeletingVariant(null)
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete variant'))
    } finally {
      setDeletingBusy(false)
    }
  }

  if (loading) return <PageLoader />
  if (fetchError || !product) return (
    <div style={{ textAlign: 'center', padding: '96px 0', color: 'var(--ink-4)' }}>
      <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink-2)' }}>Product not found</p>
      <Link href="/admin/products" style={{ color: 'var(--terracotta)', fontSize: 13, marginTop: 8, display: 'inline-block' }}>
        Back to products
      </Link>
    </div>
  )

  const statusTone = status === 'active' ? 'success' : 'neutral'
  const statusLabel = status === 'active' ? 'Active' : status === 'draft' ? 'Draft' : 'Archived'
  const existingImages = product.ProductImages ?? []

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
                Products / Edit
              </span>
              <Badge tone={statusTone} dot size="sm">{statusLabel}</Badge>
            </div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 36, color: 'var(--ink)', lineHeight: 1.1, margin: 0, fontWeight: 400 }}>
              {product.name}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="button" variant="ghost" size="sm" onClick={onDiscard}>Discard</Button>
            <Button type="submit" variant="primary" size="sm" icon={<I.check />} loading={isSubmitting}>
              Save changes
            </Button>
          </div>
        </div>

        {/* Body grid */}
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

              {newImages.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--warn)', background: 'var(--warn-tint)', padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>
                  Uploading new images will replace all existing images on save.
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {/* Existing images */}
                {newImages.length === 0 && existingImages.map((img) => (
                  <div key={img.id} style={{ position: 'relative', height: 140, borderRadius: 12, overflow: 'hidden', background: 'var(--bg-muted)', border: img.isPrimary ? '2px solid var(--ink)' : '1px solid var(--line)' }}>
                    <Image src={getImageUrl(img.imageUrl)} alt="product" fill style={{ objectFit: 'cover' }} sizes="200px" />
                    {img.isPrimary && (
                      <span style={{ position: 'absolute', bottom: 6, left: 6, background: 'var(--ink)', color: 'var(--bg)', fontSize: 10, padding: '2px 8px', borderRadius: 999, letterSpacing: 0.3 }}>
                        primary
                      </span>
                    )}
                  </div>
                ))}

                {/* New uploads */}
                {newPreviews.map((src, i) => (
                  <div key={i} style={{ position: 'relative', height: 140, borderRadius: 12, overflow: 'hidden', background: 'var(--bg-muted)', border: i === 0 ? '2px solid var(--ink)' : '1px solid var(--line)' }}>
                    <Image src={src} alt={`new-${i}`} fill style={{ objectFit: 'cover' }} sizes="200px" />
                    <button
                      type="button"
                      aria-label={`Remove image ${i + 1}`}
                      onClick={() => removeNew(i)}
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

                {/* Upload slot */}
                {newImages.length < 5 && (
                  <label style={{ height: 140, borderRadius: 12, border: '1.5px dashed var(--line-strong)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--ink-3)', cursor: 'pointer', background: 'var(--bg)' }}>
                    <I.upload size={20} />
                    <span style={{ fontSize: 12 }}>Upload</span>
                    <input type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleImages} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
            </Card>

            {/* Variants */}
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>Variants</div>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{variants.length} total</span>
              </div>

              {variants.length === 0 ? (
                <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 13, background: 'var(--bg-muted)', borderRadius: 10 }}>
                  No variants yet. Add sizes, colors, or materials to offer options.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <tbody>
                    {variants.map((v) => (
                      <tr key={v.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '12px 0' }}>
                          <button
                            type="button"
                            onClick={() => openEditVariant(v)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                          >
                            <div style={{ width: 32, height: 32, borderRadius: 6, background: v.colorHex || 'var(--bg-muted)', border: '1px solid var(--line)' }} />
                            <span style={{ color: 'var(--ink)' }}>{v.name}</span>
                          </button>
                        </td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>{v.sku || '—'}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', color: v.stock < 10 ? 'var(--warn)' : 'var(--ink)' }}>{v.stock} units</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ink)' }}>
                          {v.priceOverride ? `$${v.priceOverride}` : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 4 }}>
                            <IconBtn type="button" icon={<I.edit />} variant="ghost" aria-label={`Edit ${v.name}`} onClick={() => openEditVariant(v)} />
                            <IconBtn type="button" icon={<I.trash />} variant="ghost" aria-label={`Delete ${v.name}`} onClick={() => setDeletingVariant(v)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={<I.plus />}
                style={{ marginTop: 12 }}
                onClick={openNewVariant}
              >
                Add variant
              </Button>
            </Card>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Status */}
            <Card>
              <div style={{ marginBottom: 4, fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>Status</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>
                {status === 'active' && 'Visible on the storefront.'}
                {status === 'draft' && 'Hidden from the storefront. Use while preparing the product.'}
                {status === 'archived' && 'This product is archived. Restore it from the Products list.'}
              </div>
              <Field label="Visibility">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Status)}
                  style={selectStyle}
                >
                  <option value="active">Active — visible</option>
                  <option value="draft">Draft — hidden</option>
                  {status === 'archived' && <option value="archived">Archived</option>}
                </select>
              </Field>
            </Card>

            {/* Pricing */}
            <Card>
              <div style={{ marginBottom: 16, fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>Pricing</div>
              {hasVariants && (
                <div style={{ padding: 10, background: 'var(--bg-muted)', borderRadius: 8, fontSize: 12, color: 'var(--ink-3)', marginBottom: 12 }}>
                  Managed by variants — each variant sets its own price.
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12, marginBottom: 12 }}>
                <Field
                  label={hasVariants ? 'Price (fallback)' : 'Price'}
                  required={!hasVariants}
                  hint={hasVariants ? 'Used only if a variant has no price' : undefined}
                  error={errors.price?.message}
                >
                  <Input type="number" step="0.01" min="0" inputMode="decimal" disabled={hasVariants} icon={<span style={{ color: 'var(--ink-3)' }}>$</span>} {...register('price')} />
                </Field>
                <Field label="Compare-at">
                  <Input type="number" step="0.01" min="0" inputMode="decimal" icon={<span style={{ color: 'var(--ink-3)' }}>$</span>} {...register('compareAtPrice')} />
                </Field>
              </div>
              <Field label="Cost per item" hint="Customers won't see this">
                <Input type="number" step="0.01" min="0" inputMode="decimal" icon={<span style={{ color: 'var(--ink-3)' }}>$</span>} {...register('costPerItem')} />
              </Field>

              {hasVariants && variantPriceRange && (
                <div style={{ padding: 12, background: 'var(--bg-muted)', borderRadius: 8, marginTop: 12 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Price range (from variants)</div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', lineHeight: 1.1, marginTop: 2 }}>
                    {variantPriceRange.min === variantPriceRange.max
                      ? `$${variantPriceRange.min.toFixed(2)}`
                      : `$${variantPriceRange.min.toFixed(2)} – $${variantPriceRange.max.toFixed(2)}`}
                  </div>
                </div>
              )}
              {margin && !hasVariants && (
                <div style={{ padding: 12, background: 'var(--sage-tint)', borderRadius: 8, fontSize: 12, color: 'var(--sage-2)', marginTop: 12 }}>
                  Margin <strong style={{ fontWeight: 600 }}>{margin.pct.toFixed(1)}%</strong> · Profit{' '}
                  <strong style={{ fontWeight: 600 }}>${margin.profit.toFixed(2)}</strong>
                </div>
              )}
              {compareAtDiscount && !hasVariants && (
                <div style={{ padding: 12, background: 'var(--terracotta-tint)', borderRadius: 8, fontSize: 12, color: 'var(--terracotta-2)', marginTop: 8 }}>
                  On sale · <strong style={{ fontWeight: 600 }}>{compareAtDiscount}% off</strong> compare-at price
                </div>
              )}
            </Card>

            {/* Inventory */}
            <Card>
              <div style={{ marginBottom: 16, fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>Inventory</div>
              {hasVariants ? (
                <div style={{ padding: 10, background: 'var(--bg-muted)', borderRadius: 8, fontSize: 12, color: 'var(--ink-3)', marginBottom: 12 }}>
                  Managed by variants — stock is summed from the variant rows.
                </div>
              ) : (
                <Field label="Stock on hand" required error={errors.stock?.message}>
                  <Input type="number" min="0" inputMode="numeric" {...register('stock')} />
                </Field>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', marginTop: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Track inventory</span>
                <Switch checked={trackInventory} onChange={setTrackInventory} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Continue selling when out</span>
                <Switch checked={continueSelling} onChange={setContinueSelling} />
              </div>
              <div style={{ height: 1, background: 'var(--line)', margin: '12px 0' }} />
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
                Total in stock {hasVariants && <span>· across {variants.length} variant{variants.length === 1 ? '' : 's'}</span>}
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--ink)', lineHeight: 1.1, marginTop: 2 }}>
                {hasVariants ? variantStockTotal : (Number(stock) || 0)}{' '}
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
                <Field label="Slug" hint="Auto-generated from title. Edit to override.">
                  <Input {...register('slug')} onFocus={() => setSlugTouched(true)} />
                </Field>
                <Field label="Meta title">
                  <Input {...register('metaTitle')} />
                </Field>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <VariantEditor
        productId={Number(id)}
        open={editorOpen}
        variant={editingVariant}
        onClose={() => setEditorOpen(false)}
        onSaved={onVariantSaved}
      />

      <ConfirmModal
        open={deletingVariant !== null}
        title="Delete variant"
        message={
          deletingVariant
            ? `Delete ${deletingVariant.name}? This cannot be undone and will remove it from any open carts.`
            : ''
        }
        confirmLabel="Delete variant"
        loading={deletingBusy}
        onConfirm={onConfirmDelete}
        onClose={() => { if (!deletingBusy) setDeletingVariant(null) }}
      />
    </form>
  )
}
