'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { variantsApi } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import type { ProductVariant } from '@/types'

interface VariantEditorProps {
  productId: number
  open: boolean
  variant: ProductVariant | null
  onClose: () => void
  onSaved: (variant: ProductVariant) => void
}

interface FormState {
  name: string
  sku: string
  color: string
  colorHex: string
  size: string
  stock: string
  priceOverride: string
  sortOrder: string
}

const EMPTY: FormState = {
  name: '',
  sku: '',
  color: '',
  colorHex: '',
  size: '',
  stock: '0',
  priceOverride: '',
  sortOrder: '0',
}

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

const buildDefaultName = (color: string, size: string): string => {
  if (color && size) return `${color} / ${size}`
  return color || size
}

export default function VariantEditor({ productId, open, variant, onClose, onSaved }: VariantEditorProps) {
  const isEdit = variant !== null
  const [form, setForm] = useState<FormState>(EMPTY)
  const [nameTouched, setNameTouched] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    if (variant) {
      setForm({
        name: variant.name ?? '',
        sku: variant.sku ?? '',
        color: variant.color ?? '',
        colorHex: variant.colorHex ?? '',
        size: variant.size ?? '',
        stock: String(variant.stock ?? 0),
        priceOverride: variant.priceOverride != null ? String(variant.priceOverride) : '',
        sortOrder: String(variant.sortOrder ?? 0),
      })
      setNameTouched(true)
    } else {
      setForm(EMPTY)
      setNameTouched(false)
    }
    setErrors({})
  }, [open, variant])

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (!nameTouched && (key === 'color' || key === 'size')) {
        next.name = buildDefaultName(
          key === 'color' ? (value as string) : prev.color,
          key === 'size' ? (value as string) : prev.size,
        )
      }
      return next
    })
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) next.name = 'Name is required'
    else if (form.name.trim().length > 100) next.name = 'Max 100 characters'
    if (form.sku && form.sku.length > 80) next.sku = 'Max 80 characters'
    if (form.color && form.color.length > 40) next.color = 'Max 40 characters'
    if (form.size && form.size.length > 40) next.size = 'Max 40 characters'
    if (form.colorHex && !HEX_RE.test(form.colorHex.trim())) {
      next.colorHex = 'Use #RGB or #RRGGBB'
    }
    const stockNum = Number(form.stock)
    if (!Number.isFinite(stockNum) || stockNum < 0 || !Number.isInteger(stockNum)) {
      next.stock = 'Whole number, 0 or more'
    }
    if (form.priceOverride) {
      const p = Number(form.priceOverride)
      if (!Number.isFinite(p) || p < 0) next.priceOverride = 'Must be 0 or more'
    }
    const sortNum = Number(form.sortOrder || 0)
    if (!Number.isFinite(sortNum) || !Number.isInteger(sortNum)) {
      next.sortOrder = 'Whole number'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!validate()) return
    const payload: Partial<ProductVariant> = {
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      color: form.color.trim() || null,
      colorHex: form.colorHex.trim() || null,
      size: form.size.trim() || null,
      stock: Number(form.stock),
      priceOverride: form.priceOverride ? form.priceOverride : null,
      sortOrder: Number(form.sortOrder || 0),
    }
    setSubmitting(true)
    try {
      const saved = isEdit && variant
        ? await variantsApi.update(productId, variant.id, payload)
        : await variantsApi.create(productId, payload)
      onSaved(saved as ProductVariant)
      toast.success(isEdit ? 'Variant updated' : 'Variant added')
      onClose()
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save variant'))
    } finally {
      setSubmitting(false)
    }
  }

  const swatch = HEX_RE.test(form.colorHex.trim()) ? form.colorHex.trim() : null

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit variant' : 'Add variant'}
      description="Variants are saved immediately, separately from product details."
      onClose={() => { if (!submitting) onClose() }}
      size="lg"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Name" required error={errors.name}>
          <Input
            value={form.name}
            onChange={(e) => { setNameTouched(true); setField('name', e.target.value) }}
            placeholder="e.g. Oat / S"
            autoFocus
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
          <Field label="Color" hint="Display label, e.g. Oat" error={errors.color}>
            <Input value={form.color} onChange={(e) => setField('color', e.target.value)} placeholder="Oat" />
          </Field>
          <Field label="Color hex" hint="Click the swatch to pick, or type #RRGGBB" error={errors.colorHex}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
              <label
                style={{
                  position: 'relative',
                  width: 40,
                  flex: '0 0 40px',
                  borderRadius: 8,
                  border: '1px solid var(--line-2)',
                  background: swatch ?? 'var(--bg-muted)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                }}
                aria-label="Pick color"
                title="Pick color"
              >
                <input
                  type="color"
                  value={swatch ?? '#cccccc'}
                  onChange={(e) => setField('colorHex', e.target.value.toUpperCase())}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                    border: 'none',
                  }}
                />
              </label>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Input
                  value={form.colorHex}
                  onChange={(e) => setField('colorHex', e.target.value)}
                  placeholder="#E8C99B"
                />
              </div>
            </div>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
          <Field label="Size" hint="e.g. S, M, L, 32" error={errors.size}>
            <Input value={form.size} onChange={(e) => setField('size', e.target.value)} placeholder="S" />
          </Field>
          <Field label="SKU" error={errors.sku}>
            <Input value={form.sku} onChange={(e) => setField('sku', e.target.value)} placeholder="LFS-OAT-S" />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
          <Field label="Stock" required error={errors.stock}>
            <Input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={form.stock}
              onChange={(e) => setField('stock', e.target.value)}
            />
          </Field>
          <Field label="Price override" hint="Leave empty to use product price" error={errors.priceOverride}>
            <Input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              icon={<span style={{ color: 'var(--ink-3)' }}>$</span>}
              value={form.priceOverride}
              onChange={(e) => setField('priceOverride', e.target.value)}
            />
          </Field>
          <Field label="Sort order" hint="Lower appears first" error={errors.sortOrder}>
            <Input
              type="number"
              step="1"
              inputMode="numeric"
              value={form.sortOrder}
              onChange={(e) => setField('sortOrder', e.target.value)}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2" style={{ marginTop: 8 }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            {isEdit ? 'Save variant' : 'Add variant'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
