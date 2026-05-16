'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { vendorsApi, VendorWriteData } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/utils'
import Button, { IconBtn } from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import Switch from '@/components/ui/Switch'
import { I } from '@/components/ui/Icons'
import type { Vendor } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  slug: z.string().max(120).optional(),
  description: z.string().max(2000).optional(),
  websiteUrl: z
    .string()
    .max(500)
    .optional()
    .refine(
      (v) => !v || /^https?:\/\//i.test(v),
      'Website must start with http:// or https://',
    ),
})

type FormValues = z.infer<typeof schema>

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

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

interface Props {
  mode: 'new' | 'edit'
  vendor?: Vendor
}

export default function VendorForm({ mode, vendor }: Props) {
  const router = useRouter()
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(vendor?.logoUrl ?? null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [active, setActive] = useState<boolean>(vendor ? vendor.status === 'active' : true)
  const [slugTouched, setSlugTouched] = useState<boolean>(mode === 'edit')
  const previewRef = useRef<string | null>(null)

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
      name: vendor?.name ?? '',
      slug: vendor?.slug ?? '',
      description: vendor?.description ?? '',
      websiteUrl: vendor?.websiteUrl ?? '',
    },
  })

  const name = watch('name')

  useEffect(() => {
    if (!slugTouched && name) setValue('slug', slugify(name))
  }, [name, slugTouched, setValue])

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    }
  }, [])

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    const url = URL.createObjectURL(file)
    previewRef.current = url
    setLogoFile(file)
    setLogoPreview(url)
    setRemoveLogo(false)
  }

  const clearLogo = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = null
    setLogoFile(null)
    setLogoPreview(null)
    setRemoveLogo(true)
  }

  const onSubmit = async (data: FormValues) => {
    try {
      const payload: VendorWriteData = {
        name: data.name.trim(),
        slug: data.slug?.trim() || undefined,
        description: data.description?.trim() || null,
        websiteUrl: data.websiteUrl?.trim() || null,
        status: active ? 'active' : 'inactive',
      }
      if (mode === 'new') {
        await vendorsApi.create(payload, logoFile)
        toast.success('Vendor created')
      } else if (vendor) {
        await vendorsApi.update(vendor.id, payload, logoFile, {
          clearLogo: !logoFile && removeLogo,
        })
        toast.success('Vendor updated')
      }
      router.push('/admin/vendors')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save vendor'))
    }
  }

  const onDiscard = () => {
    if (!name && !logoFile) return router.push('/admin/vendors')
    if (confirm('Discard changes?')) router.push('/admin/vendors')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 980, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Link href="/admin/vendors" aria-label="Back to vendors">
                <IconBtn icon={<I.chev_l />} variant="bordered" size={28} />
              </Link>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Vendors / {mode === 'new' ? 'New' : 'Edit'}
              </span>
              <Badge tone={active ? 'success' : 'neutral'} dot size="sm">
                {active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 36, color: 'var(--ink)', lineHeight: 1.1, margin: 0, fontWeight: 400 }}>
              {name || 'Untitled vendor'}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="button" variant="ghost" size="sm" onClick={onDiscard}>
              {mode === 'new' ? 'Discard' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" size="sm" icon={<I.check />} loading={isSubmitting}>
              {mode === 'new' ? 'Create vendor' : 'Save changes'}
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card>
              <div style={{ marginBottom: 4, fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>Details</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>
                Public-facing on the storefront marquee and product pages.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label="Name" required error={errors.name?.message}>
                  <Input {...register('name')} placeholder="e.g. Maison Brut" />
                </Field>
                <Field label="Slug" hint="Auto-generated from name. URL-safe lowercase." error={errors.slug?.message}>
                  <Input
                    {...register('slug')}
                    onFocus={() => setSlugTouched(true)}
                    placeholder="e.g. maison-brut"
                  />
                </Field>
                <Field label="Description" hint="A sentence or two about the maker.">
                  <textarea
                    {...register('description')}
                    rows={4}
                    style={textareaStyle}
                    placeholder="A small Parisian atelier turning out heavy linens and cottons."
                  />
                </Field>
                <Field label="Website" hint="Optional — full URL including https://" error={errors.websiteUrl?.message}>
                  <Input {...register('websiteUrl')} placeholder="https://maisonbrut.example.com" />
                </Field>
              </div>
            </Card>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card>
              <div style={{ marginBottom: 4, fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>Logo</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>
                Square preferred. Used in the storefront vendor strip.
              </div>

              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '1 / 1',
                  borderRadius: 12,
                  background: 'var(--bg-muted)',
                  border: '1.5px dashed var(--line-strong)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {logoPreview ? (
                  <>
                    <Image src={logoPreview} alt="logo preview" fill style={{ objectFit: 'contain' }} sizes="320px" />
                    <button
                      type="button"
                      aria-label="Remove logo"
                      onClick={clearLogo}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        background: 'var(--ink)',
                        color: 'var(--bg)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <I.x size={14} />
                    </button>
                  </>
                ) : (
                  <label
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      color: 'var(--ink-3)',
                      cursor: 'pointer',
                    }}
                  >
                    <I.upload size={22} />
                    <span style={{ fontSize: 13 }}>Upload logo</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>JPEG, PNG, WebP up to 5MB</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={onLogoChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>

              {logoPreview && (
                <div style={{ marginTop: 12 }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: '1px solid var(--line)',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: 'var(--ink-2)',
                      background: 'var(--bg-elev)',
                    }}
                  >
                    <I.upload size={14} /> Replace
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={onLogoChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              )}
            </Card>

            <Card>
              <div style={{ marginBottom: 12, fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>Status</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                <div>
                  <div style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>Active</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                    Inactive vendors are hidden from the storefront marquee.
                  </div>
                </div>
                <Switch checked={active} onChange={setActive} />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </form>
  )
}
