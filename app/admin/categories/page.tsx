'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { categoriesApi } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/utils'
import Button, { IconBtn } from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import SectionHead from '@/components/ui/SectionHead'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import Modal, { ConfirmModal } from '@/components/ui/Modal'
import { I } from '@/components/ui/Icons'
import type { Category } from '@/types'

const TH_STYLE: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 16px',
  fontSize: 11.5,
  fontWeight: 500,
  color: 'var(--ink-3)',
  textTransform: 'uppercase',
  letterSpacing: 0.04,
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setCategories(await categoriesApi.list())
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load categories'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return categories
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
    )
  }, [categories, search])

  const openNew = () => {
    setEditing('new')
    setName('')
    setSlug('')
    setSlugTouched(false)
  }

  const openEdit = (c: Category) => {
    setEditing(c)
    setName(c.name)
    setSlug(c.slug)
    setSlugTouched(true)
  }

  const closeEditor = () => {
    setEditing(null)
    setName('')
    setSlug('')
    setSlugTouched(false)
  }

  const onNameChange = (v: string) => {
    setName(v)
    if (!slugTouched) setSlug(slugify(v))
  }

  const save = async () => {
    if (!name.trim()) return toast.error('Name is required')
    setSaving(true)
    try {
      if (editing === 'new') {
        await categoriesApi.create({ name: name.trim(), slug: slug.trim() || undefined })
        toast.success('Category created')
      } else if (editing) {
        await categoriesApi.update(editing.id, { name: name.trim(), slug: slug.trim() || undefined })
        toast.success('Category updated')
      }
      await load()
      closeEditor()
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save category'))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setSaving(true)
    try {
      await categoriesApi.remove(deleting.id)
      toast.success('Category deleted')
      await load()
      setDeleting(null)
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete category'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHead
        title="Categories"
        sub={`${categories.length} ${categories.length === 1 ? 'category' : 'categories'}. Products reference these by id.`}
        right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Input
              inputSize="sm"
              icon={<I.search />}
              placeholder="Search categories"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              full={false}
            />
            <Button variant="primary" size="sm" icon={<I.plus />} onClick={openNew}>
              New category
            </Button>
          </div>
        }
      />

      <Card padding={0}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-muted)' }}>
                <th style={TH_STYLE}>Name</th>
                <th style={TH_STYLE}>Slug</th>
                <th style={TH_STYLE}>Created</th>
                <th style={{ ...TH_STYLE, textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)' }}>
                    Loading…
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)' }}>
                    No categories yet. Create your first one.
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)' }}>
                    No categories match “{search}”.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '14px 16px', color: 'var(--ink)', fontWeight: 500 }}>
                      {c.name}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: 12.5 }}>
                      {c.slug}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--ink-3)' }}>
                      {c.createdAt
                        ? new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 4 }}>
                        <IconBtn icon={<I.edit />} variant="ghost" size={28} aria-label={`Edit ${c.name}`} onClick={() => openEdit(c)} />
                        <IconBtn icon={<I.trash />} variant="ghost" size={28} aria-label={`Delete ${c.name}`} onClick={() => setDeleting(c)} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={editing !== null}
        title={editing === 'new' ? 'New category' : 'Edit category'}
        description="Categories group products across the storefront."
        onClose={closeEditor}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Name" required>
            <Input value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="e.g. Apparel" autoFocus />
          </Field>
          <Field label="Slug" hint="Auto-generated from name. URL-safe lowercase.">
            <Input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true) }} onFocus={() => setSlugTouched(true)} placeholder="e.g. apparel" />
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <Button variant="secondary" size="sm" onClick={closeEditor} disabled={saving}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={save} loading={saving}>
              {editing === 'new' ? 'Create' : 'Save changes'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={deleting !== null}
        title="Delete category?"
        message={
          deleting
            ? `Delete "${deleting.name}"? Products in this category will become uncategorized but will not be deleted.`
            : ''
        }
        confirmLabel="Delete"
        loading={saving}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
