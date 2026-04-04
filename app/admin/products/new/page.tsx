'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Upload, X, ImageIcon } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { productsApi, categoriesApi } from '@/lib/api'
import Button from '@/components/ui/Button'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(2000).optional(),
  price: z.coerce.number().positive('Price must be greater than 0'),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative'),
  category: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function NewProductPage() {
  const router = useRouter()
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    categoriesApi.getAll().then(res => setCategories(res.categories)).catch(() => {})
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remaining = 5 - images.length
    const selected = files.slice(0, remaining)
    setImages(prev => [...prev, ...selected])
    setPreviews(prev => [...prev, ...selected.map(f => URL.createObjectURL(f))])
  }

  const removeImage = (i: number) => {
    URL.revokeObjectURL(previews[i])
    setImages(prev => prev.filter((_, idx) => idx !== i))
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const onSubmit = async (data: FormData) => {
    try {
      await productsApi.create(
        { ...data, category: data.category || undefined, description: data.description || undefined },
        images.length ? images : undefined
      )
      toast.success('Product created!')
      router.push('/admin/products')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create product'
      toast.error(msg)
    }
  }

  const fieldClass = (hasError: boolean) =>
    `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'
    }`

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/products">
          <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">New Product</h2>
          <p className="text-sm text-gray-500">Fill in the details below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-semibold text-gray-900">Product Details</h3>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Name *</label>
                <input {...register('name')} className={fieldClass(!!errors.name)} placeholder="e.g. Premium Wireless Headphones" />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea {...register('description')} rows={4} placeholder="Describe the product..."
                  className={`${fieldClass(false)} resize-none`} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Price ($) *</label>
                  <input {...register('price')} type="number" step="0.01" min="0" className={fieldClass(!!errors.price)} placeholder="0.00" />
                  {errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Stock *</label>
                  <input {...register('stock')} type="number" min="0" className={fieldClass(!!errors.stock)} placeholder="0" />
                  {errors.stock && <p className="text-xs text-red-500">{errors.stock.message}</p>}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Category</label>
                <select {...register('category')} className={`${fieldClass(false)} bg-white`}>
                  <option value="">No category</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Images</h3>
                <span className="text-xs text-gray-400">{images.length}/5</span>
              </div>

              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {previews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                      <Image src={src} alt={`preview-${i}`} fill className="object-cover" />
                      <button type="button" onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={10} className="text-white" />
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1 py-0.5 rounded">Primary</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {images.length < 5 && (
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

              {previews.length === 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <ImageIcon size={14} />
                  First image will be the primary
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <Link href="/admin/products"><Button variant="secondary">Cancel</Button></Link>
          <Button type="submit" loading={isSubmitting}>Create Product</Button>
        </div>
      </form>
    </div>
  )
}
