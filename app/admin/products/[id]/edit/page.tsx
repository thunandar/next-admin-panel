'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { productsApi, categoriesApi } from '@/lib/api'
import { getApiErrorMessage, getImageUrl } from '@/lib/utils'
import Button from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import type { Product } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(2000).optional(),
  price: z.coerce.number().positive('Price must be greater than 0'),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative'),
  category: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [newImages, setNewImages] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const previewsRef = useRef<string[]>([])

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
  })

  useEffect(() => {
    categoriesApi.getAll().then(res => setCategories(res.categories)).catch(() => {})
  }, [])

  useEffect(() => {
    productsApi
      .getById(Number(id))
      .then(({ data }) => {
        setProduct(data)
        reset({
          name: data.name,
          description: data.description || '',
          price: Number(data.price),
          stock: data.stock,
          category: data.category || '',
        })
      })
      .catch(() => { toast.error('Product not found'); setFetchError(true) })
      .finally(() => setLoading(false))
  }, [id, reset])

  // Keep ref in sync so cleanup always revokes the latest previews
  useEffect(() => { previewsRef.current = newPreviews }, [newPreviews])
  useEffect(() => { return () => { previewsRef.current.forEach(URL.revokeObjectURL) } }, [])

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setNewImages((prev) => [...prev, ...files].slice(0, 5))
    setNewPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))].slice(0, 5))
  }

  const removeNew = (i: number) => {
    const url = newPreviews[i]
    if (url) URL.revokeObjectURL(url)
    setNewImages((p) => p.filter((_, idx) => idx !== i))
    setNewPreviews((p) => p.filter((_, idx) => idx !== i))
  }

  const onSubmit = async (data: FormValues) => {
    try {
      await productsApi.update(Number(id), {
        ...data,
        category: data.category || undefined,
        description: data.description || undefined,
      }, newImages.length ? newImages : undefined)
      toast.success('Product updated!')
      router.push('/admin/products')
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to update product'))
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

  const fieldClass = (hasError: boolean) =>
    `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'}`

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/products">
          <button aria-label="Back to products" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Edit Product</h2>
          <p className="text-sm text-gray-500">{product.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Product Details */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-semibold text-gray-900">Product Details</h3>

              <div className="flex flex-col gap-1">
                <label htmlFor="edit-name" className="text-sm font-medium text-gray-700">Name *</label>
                <input id="edit-name" {...register('name')} className={fieldClass(!!errors.name)} placeholder="e.g. Premium Wireless Headphones" />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="edit-description" className="text-sm font-medium text-gray-700">Description</label>
                <textarea id="edit-description" rows={4} {...register('description')} className={`${fieldClass(false)} resize-none`} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-price" className="text-sm font-medium text-gray-700">Price ($) *</label>
                  <input id="edit-price" type="number" step="0.01" min="0" {...register('price')} className={fieldClass(!!errors.price)} />
                  {errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-stock" className="text-sm font-medium text-gray-700">Stock *</label>
                  <input id="edit-stock" type="number" min="0" {...register('stock')} className={fieldClass(!!errors.stock)} />
                  {errors.stock && <p className="text-xs text-red-500">{errors.stock.message}</p>}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="edit-category" className="text-sm font-medium text-gray-700">Category</label>
                <select id="edit-category" {...register('category')} className={`${fieldClass(false)} bg-white`}>
                  <option value="">No category</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Right: Images */}
          <div className="space-y-4">
            {product.ProductImages.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-3">
                <h3 className="font-semibold text-gray-900">Current Images</h3>
                <div className="grid grid-cols-3 gap-2">
                  {product.ProductImages.map((img) => (
                    <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <Image src={getImageUrl(img.imageUrl)} alt="product" fill className="object-cover" />
                      {img.isPrimary && (
                        <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1 py-0.5 rounded">Primary</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Replace Images</h3>
                <span className="text-xs text-gray-400">{newImages.length}/5</span>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                Uploading new images will replace all existing images.
              </p>

              {newPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {newPreviews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                      <Image src={src} alt={`new-${i}`} fill className="object-cover" />
                      <button
                        type="button"
                        aria-label={`Remove image ${i + 1}`}
                        onClick={() => removeNew(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {newImages.length < 5 && (
                <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Upload size={18} className="text-gray-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">Upload images</p>
                    <p className="text-xs text-gray-400">JPEG, PNG, WebP up to 5MB</p>
                  </div>
                  <input type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleImages} className="hidden" />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <Link href="/admin/products">
            <Button variant="secondary">Cancel</Button>
          </Link>
          <Button type="submit" loading={isSubmitting}>Save Changes</Button>
        </div>
      </form>
    </div>
  )
}
