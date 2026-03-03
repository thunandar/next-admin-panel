'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { productsApi } from '@/lib/api'
import { getImageUrl } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/Spinner'
import type { Product, UpdateProductData } from '@/types'

const CATEGORIES = ['Electronics', 'Clothing', 'Food', 'Books', 'Furniture', 'Sports', 'Beauty', 'Other']

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newImages, setNewImages] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<UpdateProductData>({})

  useEffect(() => {
    productsApi
      .getById(Number(id))
      .then(({ data }) => {
        setProduct(data)
        setForm({
          name: data.name,
          description: data.description || '',
          price: Number(data.price),
          stock: data.stock,
          category: data.category || '',
        })
      })
      .catch(() => toast.error('Product not found'))
      .finally(() => setLoading(false))
  }, [id])

  const set = (key: keyof UpdateProductData, value: string | number) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name || form.name.length < 2) e.name = 'Name must be at least 2 characters'
    if (!form.price || Number(form.price) <= 0) e.price = 'Price must be greater than 0'
    if (Number(form.stock) < 0) e.stock = 'Stock cannot be negative'
    return e
  }

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setNewImages((prev) => [...prev, ...files].slice(0, 5))
    setNewPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))].slice(0, 5))
  }

  const removeNew = (i: number) => {
    URL.revokeObjectURL(newPreviews[i])
    setNewImages((p) => p.filter((_, idx) => idx !== i))
    setNewPreviews((p) => p.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSaving(true)
    try {
      const data: UpdateProductData = {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
        category: (form.category as string) || undefined,
        description: (form.description as string) || undefined,
      }
      await productsApi.update(Number(id), data, newImages.length ? newImages : undefined)
      toast.success('Product updated!')
      router.push('/admin/products')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update product'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />
  if (!product) return null

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/products">
          <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Edit Product</h2>
          <p className="text-sm text-gray-500">{product.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Product Details */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-semibold text-gray-900">Product Details</h3>

              <Input
                label="Name"
                value={form.name as string || ''}
                onChange={(e) => set('name', e.target.value)}
                error={errors.name}
              />

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows={4}
                  value={form.description as string || ''}
                  onChange={(e) => set('description', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Price ($)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price || ''}
                  onChange={(e) => set('price', e.target.value)}
                  error={errors.price}
                />
                <Input
                  label="Stock"
                  type="number"
                  min="0"
                  value={form.stock ?? ''}
                  onChange={(e) => set('stock', e.target.value)}
                  error={errors.stock}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Category</label>
                <select
                  value={form.category as string || ''}
                  onChange={(e) => set('category', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">No category</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Right: Images */}
          <div className="space-y-4">
            {/* Current images */}
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

            {/* Replace images */}
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
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleImages}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <Link href="/admin/products">
            <Button variant="secondary">Cancel</Button>
          </Link>
          <Button type="submit" loading={saving}>Save Changes</Button>
        </div>
      </form>
    </div>
  )
}
