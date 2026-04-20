'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Edit, Trash2, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { productsApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency, formatDate, getStockStatus, getImageUrl } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/Spinner'
import type { Product } from '@/types'

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

  useEffect(() => {
    productsApi
      .getById(Number(id))
      .then(({ data }) => setProduct(data))
      .catch(() => { toast.error('Product not found'); setFetchError(true) })
      .finally(() => setLoading(false))
  }, [id])

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
    <div className="text-center py-24 text-gray-400">
      <p className="text-lg font-medium">Product not found</p>
      <Link href="/admin/products" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
        Back to products
      </Link>
    </div>
  )

  const images = product.ProductImages || []
  const status = getStockStatus(product.stock)
  const activeImage = images[activeImg]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back + Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/products">
            <button aria-label="Back to products" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{product.name}</h2>
            <p className="text-sm text-gray-500">Product #{product.id}</p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Link href={`/admin/products/${product.id}/edit`}>
              <Button variant="secondary" size="sm">
                <Edit size={14} /> Edit
              </Button>
            </Link>
            <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
              <Trash2 size={14} /> Delete
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Images */}
        <div className="space-y-3">
          <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
            {activeImage ? (
              <Image
                src={getImageUrl(activeImage.imageUrl)}
                alt={product.name}
                width={500}
                height={500}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package size={60} className="text-gray-300" />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImg(i)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                    i === activeImg ? 'border-blue-500' : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <Image
                    src={getImageUrl(img.imageUrl)}
                    alt={`${product.name} ${i + 1}`}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(product.price)}</h3>
              {product.category && <Badge variant="blue" className="mt-2">{product.category}</Badge>}
            </div>

            {product.description && (
              <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
            )}

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Stock</p>
                <Badge variant={status === 'ok' ? 'green' : status === 'low' ? 'yellow' : 'red'}>
                  {product.stock} units
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
                <Badge variant={status === 'ok' ? 'green' : status === 'low' ? 'yellow' : 'red'}>
                  {status === 'ok' ? 'In Stock' : status === 'low' ? 'Low Stock' : 'Out of Stock'}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Added</p>
                <p className="text-sm text-gray-700">{formatDate(product.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Updated</p>
                <p className="text-sm text-gray-700">{formatDate(product.updatedAt)}</p>
              </div>
            </div>
          </div>

          {images.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Images</p>
              <p className="text-sm text-gray-700">{images.length} image{images.length !== 1 ? 's' : ''} attached</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={showDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${product.name}"? This cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setShowDelete(false)}
      />
    </div>
  )
}
