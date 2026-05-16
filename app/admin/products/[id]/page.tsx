'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ordersApi, productsApi, reviewsApi, type AdminReview } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency, formatDate, getStockStatus, getImageUrl } from '@/lib/utils'
import Button, { IconBtn } from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import { ConfirmModal } from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/Spinner'
import { I } from '@/components/ui/Icons'
import PlaceholderImg from '@/components/ui/PlaceholderImg'
import type { Order, Product } from '@/types'

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--ink-3)',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 6,
}

const valueStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--ink)',
}

const cardTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--serif)',
  fontSize: 17,
  color: 'var(--ink)',
  fontWeight: 400,
  marginBottom: 14,
}

const ORDER_STATUS_TONE: Record<Order['status'], 'neutral' | 'info' | 'success' | 'warn' | 'danger' | 'sage'> = {
  pending: 'warn',
  confirmed: 'info',
  shipped: 'sage',
  delivered: 'success',
  cancelled: 'danger',
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--ink)', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
  const full = Math.round(rating)
  return (
    <span style={{ display: 'inline-flex', gap: 2, color: 'var(--terracotta)', lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ fontSize: size, color: i <= full ? 'var(--terracotta)' : 'var(--ink-4)' }}>★</span>
      ))}
    </span>
  )
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [reviewMeta, setReviewMeta] = useState<{ avgRating: number | null; totalReviews: number }>({ avgRating: null, totalReviews: 0 })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [recentTotal, setRecentTotal] = useState(0)

  useEffect(() => {
    productsApi
      .getById(Number(id))
      .then(({ data }) => setProduct(data))
      .catch(() => { toast.error('Product not found'); setFetchError(true) })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!isAdmin || !id) return
    const productId = Number(id)
    reviewsApi.list({ productId, limit: 5, page: 1 })
      .then((r) => { setReviews(r.reviews); setReviewMeta({ avgRating: r.avgRating, totalReviews: r.totalReviews }) })
      .catch(() => { /* non-fatal */ })
    ordersApi.getAll(1, 5, undefined, productId)
      .then((r) => { setRecentOrders(r.orders); setRecentTotal(r.totalOrders) })
      .catch(() => { /* non-fatal */ })
  }, [id, isAdmin])

  const handleDelete = async () => {
    if (!product) return
    setDeleting(true)
    try {
      await productsApi.delete(product.id)
      toast.success('Product deleted')
      router.push('/admin/products')
    } catch {
      toast.error('Failed to delete product')
      setDeleting(false)
    }
  }

  if (loading) return <PageLoader />
  if (fetchError || !product) return (
    <div style={{ textAlign: 'center', padding: '96px 0' }}>
      <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink-2)' }}>Product not found</p>
      <Link href="/admin/products" style={{ color: 'var(--terracotta)', fontSize: 13, marginTop: 8, display: 'inline-block' }}>
        Back to products
      </Link>
    </div>
  )

  const images = product.ProductImages || []
  const stockStatus = getStockStatus(product.stock)
  const activeImage = images[activeImg]
  const variants = product.variants ?? []
  const compareAt = product.compareAtPrice != null && product.compareAtPrice !== '' ? Number(product.compareAtPrice) : null
  const cost = product.costPerItem != null && product.costPerItem !== '' ? Number(product.costPerItem) : null
  const price = Number(product.price)
  const discountPct = compareAt && compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : null
  const profit = cost != null && cost <= price ? price - cost : null
  const marginPct = profit != null && price > 0 ? (profit / price) * 100 : null
  const sku = `NX-${String(product.id).padStart(3, '0')}`
  const sales = product.salesCount ?? 0
  const grossRevenue = sales * price

  const statusTone =
    product.status === 'active' ? 'success' :
    product.status === 'out' ? 'danger' :
    'neutral'
  const statusLabel =
    product.status === 'active' ? 'Active' :
    product.status === 'out' ? 'Out of stock' :
    product.status === 'draft' ? 'Draft' :
    product.status === 'archived' ? 'Archived' :
    'Active'

  const stockTone = stockStatus === 'ok' ? 'success' : stockStatus === 'low' ? 'warn' : 'danger'
  const stockText = stockStatus === 'ok' ? 'In stock' : stockStatus === 'low' ? 'Low stock' : 'Out of stock'

  const lastOrderDate = recentOrders[0]?.createdAt ?? null

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1240, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Link href="/admin/products" aria-label="Back to products">
              <IconBtn icon={<I.chev_l />} variant="bordered" size={28} />
            </Link>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Products / Detail
            </span>
            {product.status && <Badge tone={statusTone} dot size="sm">{statusLabel}</Badge>}
            {product.isFeatured && <Badge tone="accent" size="sm">Featured</Badge>}
            {product.category && <Badge tone="neutral" size="sm">{product.category}</Badge>}
          </div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 30, color: 'var(--ink)', lineHeight: 1.1, margin: 0, fontWeight: 400 }}>
            {product.name}
          </h1>
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>
            {sku} · {product.vendor || 'No vendor'}
          </div>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/admin/products/${product.id}/edit`}>
              <Button variant="secondary" size="sm">Edit</Button>
            </Link>
            <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>Delete</Button>
          </div>
        )}
      </div>

      {/* KPI strip — wrapped in Card to match the rest of the page */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32 }}>
          <Stat
          label="Units sold"
          value={sales.toLocaleString()}
          sub={lastOrderDate ? `Last order ${formatDate(lastOrderDate)}` : 'No orders yet'}
        />
        <Stat
          label="Gross revenue"
          value={formatCurrency(grossRevenue)}
          sub={`${formatCurrency(price)} × ${sales.toLocaleString()}`}
        />
        <Stat
          label="Avg rating"
          value={
            reviewMeta.avgRating != null
              ? <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
                  {reviewMeta.avgRating.toFixed(1)}
                  <StarRow rating={reviewMeta.avgRating} />
                </span>
              : <span style={{ color: 'var(--ink-4)' }}>—</span>
          }
          sub={reviewMeta.totalReviews > 0 ? `${reviewMeta.totalReviews} review${reviewMeta.totalReviews === 1 ? '' : 's'}` : 'No reviews yet'}
        />
        <Stat
          label="Stock on hand"
          value={
            <span>
              {product.stock}
              <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-3)', marginLeft: 6 }}>units</span>
            </span>
          }
          sub={<Badge tone={stockTone} dot size="sm">{stockText}</Badge>}
        />
        </div>
      </Card>

      {/* Two-column body */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20 }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Image gallery */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ aspectRatio: '4 / 3', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--line)', position: 'relative' }}>
              {activeImage ? (
                <Image
                  src={getImageUrl(activeImage.imageUrl)}
                  alt={product.name}
                  fill
                  sizes="600px"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <PlaceholderImg
                  label={product.name}
                  w="100%"
                  h="100%"
                  style={{ borderRadius: 0 }}
                />
              )}
            </div>
            {images.length > 1 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    style={{
                      aspectRatio: '1 / 1',
                      borderRadius: 8,
                      overflow: 'hidden',
                      border: i === activeImg ? '2px solid var(--ink)' : '1px solid var(--line)',
                      background: 'var(--bg-muted)',
                      cursor: 'pointer',
                      padding: 0,
                      position: 'relative',
                    }}
                  >
                    <Image
                      src={getImageUrl(img.imageUrl)}
                      alt={`${product.name} ${i + 1}`}
                      fill
                      sizes="100px"
                      style={{ objectFit: 'cover' }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recent reviews */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={cardTitleStyle as React.CSSProperties}>Recent reviews</div>
              {reviewMeta.totalReviews > 0 && (
                <Link href={`/admin/reviews?productId=${product.id}`} style={{ fontSize: 12, color: 'var(--terracotta)' }}>
                  View all {reviewMeta.totalReviews} →
                </Link>
              )}
            </div>
            {reviews.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--ink-4)', margin: 0, fontStyle: 'italic' }}>No reviews for this product yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {reviews.map((r) => (
                  <li key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <StarRow rating={r.rating} size={12} />
                        <span style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.user?.name || 'Anonymous'}
                        </span>
                      </div>
                      <span style={{ fontSize: 11.5, color: 'var(--ink-4)', whiteSpace: 'nowrap' }}>{formatDate(r.createdAt)}</span>
                    </div>
                    {r.comment && (
                      <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0, lineHeight: 1.5 }}>
                        {r.comment.length > 220 ? `${r.comment.slice(0, 220)}…` : r.comment}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Recent orders */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={cardTitleStyle as React.CSSProperties}>Recent orders</div>
              {recentTotal > 0 && (
                <Link href={`/admin/orders?productId=${product.id}`} style={{ fontSize: 12, color: 'var(--terracotta)' }}>
                  View all {recentTotal} →
                </Link>
              )}
            </div>
            {recentOrders.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--ink-4)', margin: 0, fontStyle: 'italic' }}>No orders containing this product yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {recentOrders.map((o) => {
                    const item = o.items?.find((it) => it.productId === product.id)
                    const qty = item?.quantity ?? 0
                    return (
                      <tr key={o.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '10px 0', fontFamily: 'var(--mono)', fontSize: 12 }}>
                          <Link href={`/admin/orders/${o.id}`} style={{ color: 'var(--ink)' }}>
                            #{String(o.id).padStart(4, '0')}
                          </Link>
                        </td>
                        <td style={{ color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                          {o.user?.name || '—'}
                        </td>
                        <td>
                          <Badge tone={ORDER_STATUS_TONE[o.status]} dot size="sm">{o.status}</Badge>
                        </td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ink-2)', textAlign: 'right' }}>
                          {qty}× {formatCurrency(item?.price ?? price)}
                        </td>
                        <td style={{ fontSize: 11.5, color: 'var(--ink-4)', textAlign: 'right', whiteSpace: 'nowrap', paddingLeft: 12 }}>
                          {formatDate(o.createdAt)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Pricing & description */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 32, color: 'var(--ink)', fontWeight: 400, lineHeight: 1 }}>
                {formatCurrency(price)}
              </div>
              {compareAt != null && compareAt > price && (
                <div style={{ fontSize: 14, color: 'var(--ink-4)', textDecoration: 'line-through' }}>
                  {formatCurrency(compareAt)}
                </div>
              )}
              {discountPct != null && (
                <Badge tone="danger" size="sm">{discountPct}% off</Badge>
              )}
            </div>

            {product.description ? (
              <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.6, marginTop: 14, marginBottom: 0 }}>
                {product.description}
              </p>
            ) : (
              <p style={{ color: 'var(--ink-4)', fontSize: 13, marginTop: 14, marginBottom: 0, fontStyle: 'italic' }}>
                No description.
              </p>
            )}

            {product.tags && product.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
                {product.tags.map((t) => (
                  <span key={t} style={{ fontSize: 11.5, padding: '3px 8px', borderRadius: 999, background: 'var(--bg-muted)', color: 'var(--ink-2)' }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* Inventory + Margin (combined) */}
          <Card>
            <div style={cardTitleStyle as React.CSSProperties}>Inventory & margin</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, rowGap: 18 }}>
              <div>
                <div style={labelStyle}>Track inventory</div>
                <div style={valueStyle}>{product.trackInventory ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <div style={labelStyle}>Continue selling when out</div>
                <div style={valueStyle}>{product.continueSelling ? 'Yes' : 'No'}</div>
              </div>
              {cost != null && (
                <>
                  <div>
                    <div style={labelStyle}>Cost / item</div>
                    <div style={{ ...valueStyle, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(cost)}</div>
                  </div>
                  <div>
                    <div style={labelStyle}>Profit / unit</div>
                    <div style={{ ...valueStyle, fontVariantNumeric: 'tabular-nums' }}>
                      {profit != null ? formatCurrency(profit) : '—'}
                    </div>
                  </div>
                  <div>
                    <div style={labelStyle}>Margin</div>
                    <div style={{ ...valueStyle, fontVariantNumeric: 'tabular-nums' }}>
                      {marginPct != null ? `${marginPct.toFixed(1)}%` : '—'}
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Variants */}
          {variants.length > 0 && (
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={cardTitleStyle as React.CSSProperties}>Variants</div>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{variants.length} total</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {variants.map((v) => (
                    <tr key={v.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '10px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 26, height: 26, borderRadius: 6, background: v.colorHex || 'var(--bg-muted)', border: '1px solid var(--line)' }} />
                          <span style={{ color: 'var(--ink)' }}>{v.name}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>{v.sku || '—'}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: v.stock < 10 ? 'var(--warn)' : 'var(--ink)' }}>{v.stock} units</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ink)', textAlign: 'right' }}>
                        {v.priceOverride ? formatCurrency(Number(v.priceOverride)) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* Meta — combined storefront + identifiers + timestamps */}
          <Card>
            <div style={cardTitleStyle as React.CSSProperties}>Meta</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, rowGap: 16 }}>
              <div>
                <div style={labelStyle}>Featured</div>
                <div style={valueStyle}>
                  {product.isFeatured ? (
                    <Badge tone="accent" dot size="sm">On home slider · #{product.featuredOrder ?? 0}</Badge>
                  ) : (
                    <span style={{ color: 'var(--ink-3)' }}>Not featured</span>
                  )}
                </div>
              </div>
              <div>
                <div style={labelStyle}>SKU</div>
                <div style={{ ...valueStyle, fontFamily: 'var(--mono)', fontSize: 12.5 }}>{sku}</div>
              </div>
              <div>
                <div style={labelStyle}>Slug</div>
                <div style={{ ...valueStyle, fontFamily: 'var(--mono)', fontSize: 12.5, wordBreak: 'break-all' }}>
                  {product.slug || <span style={{ color: 'var(--ink-4)' }}>—</span>}
                </div>
              </div>
              <div>
                <div style={labelStyle}>Meta title</div>
                <div style={valueStyle}>
                  {product.metaTitle || <span style={{ color: 'var(--ink-4)' }}>—</span>}
                </div>
              </div>
              <div>
                <div style={labelStyle}>Added</div>
                <div style={valueStyle}>{formatDate(product.createdAt)}</div>
              </div>
              <div>
                <div style={labelStyle}>Updated</div>
                <div style={valueStyle}>{formatDate(product.updatedAt)}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmModal
        open={showDelete}
        title="Delete product"
        message={`Are you sure you want to delete "${product.name}"? This cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setShowDelete(false)}
      />
    </div>
  )
}
