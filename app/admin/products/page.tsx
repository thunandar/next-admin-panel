'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { productsApi, categoriesApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, getPrimaryImage } from '@/lib/utils';
import Button, { IconBtn } from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import SectionHead from '@/components/ui/SectionHead';
import Tabs from '@/components/ui/Tabs';
import Input from '@/components/ui/Input';
import PlaceholderImg from '@/components/ui/PlaceholderImg';
import Modal, { ConfirmModal } from '@/components/ui/Modal';
import { I } from '@/components/ui/Icons';
import type { Category, CreateProductData, Pagination as PaginationType, Product, UpdateProductData } from '@/types';

type TabValue = 'active' | 'all' | 'draft' | 'archived' | 'out';

const TH_STYLE: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 16px',
  fontSize: 11.5,
  fontWeight: 500,
  color: 'var(--ink-3)',
  textTransform: 'uppercase',
  letterSpacing: 0.04,
};

const STATUS_LABEL: Record<string, { tone: 'success' | 'warn' | 'danger' | 'neutral'; label: string }> = {
  active:   { tone: 'success', label: 'Active' },
  draft:    { tone: 'neutral', label: 'Draft' },
  out:      { tone: 'danger',  label: 'Out of stock' },
  archived: { tone: 'neutral', label: 'Archived' },
};

// When a product has variants, variants are the source of truth for stock + price.
// Otherwise, fall back to the product-level columns.
function effectiveStock(p: Product): number {
  if (p.variants && p.variants.length > 0) {
    return p.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  }
  return p.stock;
}

function effectivePriceLabel(p: Product): string {
  if (p.variants && p.variants.length > 0) {
    const fallback = Number(p.price) || 0;
    const prices = p.variants.map((v) =>
      v.priceOverride != null && v.priceOverride !== '' ? Number(v.priceOverride) : fallback,
    );
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`;
  }
  return formatCurrency(p.price);
}

type ImportRow = CreateProductData & { _row: number; _error?: string; category?: string };

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let i = 0;
  let inQuotes = false;
  const src = text.replace(/^﻿/, '');
  while (i < src.length) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim().length > 0));
}

function rowsToImport(rows: string[][]): { items: ImportRow[]; error?: string } {
  const headerRow = rows[0];
  if (!headerRow) return { items: [], error: 'File is empty' };
  const header = headerRow.map((h) => h.trim().toLowerCase());
  const idx = {
    name: header.indexOf('name'),
    description: header.indexOf('description'),
    price: header.indexOf('price'),
    stock: header.indexOf('stock'),
    category: header.indexOf('category'),
  };
  if (idx.name < 0 || idx.price < 0 || idx.stock < 0) {
    return { items: [], error: 'CSV must include name, price, and stock columns' };
  }
  const items: ImportRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    if (!cells) continue;
    const name = (cells[idx.name] ?? '').trim();
    const priceRaw = (cells[idx.price] ?? '').trim();
    const stockRaw = (cells[idx.stock] ?? '').trim();
    const description = idx.description >= 0 ? (cells[idx.description] ?? '').trim() : '';
    const category = idx.category >= 0 ? (cells[idx.category] ?? '').trim() : '';
    const price = Number(priceRaw.replace(/[$,]/g, ''));
    const stock = Number(stockRaw.replace(/,/g, ''));
    let error: string | undefined;
    if (!name) error = 'Missing name';
    else if (!Number.isFinite(price) || price < 0) error = 'Invalid price';
    else if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) error = 'Invalid stock';
    items.push({
      _row: r + 1,
      name,
      description: description || undefined,
      price,
      stock,
      category: category || undefined,
      _error: error,
    });
  }
  return { items };
}

export default function ProductsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tab, setTab] = useState<TabValue>('active');
  const [counts, setCounts] = useState<{ all?: number; active?: number; draft?: number; archived?: number; out?: number }>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'price' | 'sales' | 'name'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkAction, setBulkAction] = useState<'delete' | 'archive' | 'unarchive' | 'publish' | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(() => {});
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      if (search) {
        const res = await productsApi.search(search, page, 10);
        setProducts(res.data);
        setPagination(res.pagination);
      } else {
        const statusFilter =
          tab === 'all' || tab === 'out' ? undefined : tab;
        const stockFilter =
          tab === 'out' ? 'false' : tab === 'active' ? 'true' : undefined;
        const res = await productsApi.getAll({
          page,
          limit: 10,
          categoryId: category || undefined,
          sortBy,
          sortOrder,
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(stockFilter ? { inStock: stockFilter } : {}),
        });
        setProducts(res.data);
        setPagination(res.pagination);
      }
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [page, search, category, sortBy, sortOrder, tab]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const fetchCounts = useCallback(async () => {
    try {
      const [all, active, draft, archived, out] = await Promise.all([
        productsApi.getAll({ page: 1, limit: 1 }),
        productsApi.getAll({ page: 1, limit: 1, status: 'active', inStock: 'true' }),
        productsApi.getAll({ page: 1, limit: 1, status: 'draft' }),
        productsApi.getAll({ page: 1, limit: 1, status: 'archived' }),
        productsApi.getAll({ page: 1, limit: 1, inStock: 'false' }),
      ]);
      setCounts({
        all: all.pagination.totalItems,
        active: active.pagination.totalItems,
        draft: draft.pagination.totalItems,
        archived: archived.pagination.totalItems,
        out: out.pagination.totalItems,
      });
    } catch {
      // silently ignore — counts are non-critical UI affordance
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const toggleRow = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = products.length > 0 && products.every((p) => selected.has(p.id));
  const someSelected = !allSelected && products.some((p) => selected.has(p.id));

  const toggleAll = () => {
    setSelected((prev) => {
      if (products.every((p) => prev.has(p.id))) {
        const next = new Set(prev);
        for (const p of products) next.delete(p.id);
        return next;
      }
      const next = new Set(prev);
      for (const p of products) next.add(p.id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await productsApi.delete(deleteTarget.id);
      toast.success('Product deleted');
      setDeleteTarget(null);
      fetchProducts();
      fetchCounts();
    } catch {
      toast.error('Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  const runBulkDelete = async () => {
    const ids = Array.from(selected);
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => productsApi.delete(id)));
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed === 0) toast.success(`Deleted ${ids.length} product${ids.length > 1 ? 's' : ''}`);
      else toast.error(`Deleted ${ids.length - failed} of ${ids.length}; ${failed} failed`);
      setSelected(new Set());
      setBulkAction(null);
      fetchProducts();
      fetchCounts();
    } finally {
      setBulkBusy(false);
    }
  };

  const runBulkArchive = async () => {
    const ids = Array.from(selected);
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => productsApi.update(id, { status: 'archived' } as unknown as UpdateProductData)),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed === 0) toast.success(`Archived ${ids.length} product${ids.length > 1 ? 's' : ''}`);
      else toast.error(`Archived ${ids.length - failed} of ${ids.length}; ${failed} failed`);
      setSelected(new Set());
      setBulkAction(null);
      fetchProducts();
      fetchCounts();
    } finally {
      setBulkBusy(false);
    }
  };

  const runBulkPublish = async () => {
    const ids = Array.from(selected);
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => productsApi.update(id, { status: 'active' } as unknown as UpdateProductData)),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed === 0) toast.success(`Published ${ids.length} product${ids.length > 1 ? 's' : ''}`);
      else toast.error(`Published ${ids.length - failed} of ${ids.length}; ${failed} failed`);
      setSelected(new Set());
      setBulkAction(null);
      fetchProducts();
      fetchCounts();
    } finally {
      setBulkBusy(false);
    }
  };

  const runBulkUnarchive = async () => {
    const ids = Array.from(selected);
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => productsApi.update(id, { status: 'active' } as unknown as UpdateProductData)),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed === 0) toast.success(`Restored ${ids.length} product${ids.length > 1 ? 's' : ''}`);
      else toast.error(`Restored ${ids.length - failed} of ${ids.length}; ${failed} failed`);
      setSelected(new Set());
      setBulkAction(null);
      fetchProducts();
      fetchCounts();
    } finally {
      setBulkBusy(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const { items, error } = rowsToImport(parseCsv(text));
      if (error) { toast.error(error); return; }
      if (items.length === 0) { toast.error('No rows to import'); return; }
      setImportRows(items);
      setImportFileName(file.name);
      setImportOpen(true);
    } catch {
      toast.error('Could not read file');
    }
  };

  const runImport = async () => {
    const valid = importRows.filter((r) => !r._error);
    if (valid.length === 0) { toast.error('No valid rows to import'); return; }
    setImportBusy(true);
    let created = 0;
    let failed = 0;
    const byName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
    for (const row of valid) {
      try {
        const categoryId = row.category ? byName.get(row.category.toLowerCase()) ?? null : null;
        await productsApi.create({
          name: row.name,
          description: row.description,
          price: row.price,
          stock: row.stock,
          categoryId,
        });
        created++;
      } catch {
        failed++;
      }
    }
    setImportBusy(false);
    setImportOpen(false);
    setImportRows([]);
    setImportFileName('');
    if (failed === 0) toast.success(`Imported ${created} product${created === 1 ? '' : 's'}`);
    else toast.error(`Imported ${created}; ${failed} failed`);
    fetchProducts();
    fetchCounts();
  };

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHead
        title="Products"
        sub={`${pagination?.totalItems ?? products.length} products across ${categories.length || 'all'} collections.`}
        right={
          <>
            <span style={{ fontSize: 11.5, color: 'var(--ink-4)', letterSpacing: -0.05 }}>
              CSV — name, price, stock required
            </span>
            <Button variant="secondary" size="sm" icon={<I.upload />} onClick={handleImportClick}>Import</Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {isAdmin && (
              <Link href="/admin/products/new">
                <Button variant="primary" size="sm" icon={<I.plus />}>New product</Button>
              </Link>
            )}
          </>
        }
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Tabs<TabValue>
          tabs={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'active', label: 'Active', count: counts.active },
            { value: 'draft', label: 'Draft', count: counts.draft },
            { value: 'archived', label: 'Archived', count: counts.archived },
            { value: 'out', label: 'Out of stock', count: counts.out },
          ]}
          value={tab}
          onChange={(v) => {
            setTab(v);
            setPage(1);
          }}
        />
        <div className="flex gap-2 flex-wrap">
          <Input
            inputSize="sm"
            icon={<I.search />}
            placeholder="Search products"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            full={false}
          />
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            style={{
              height: 32,
              borderRadius: 10,
              border: '1px solid var(--line-2)',
              background: 'var(--bg-elev)',
              color: 'var(--ink)',
              fontSize: 13,
              padding: '0 10px',
            }}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={`${sortBy}_${sortOrder}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split('_') as [typeof sortBy, typeof sortOrder];
              setSortBy(by);
              setSortOrder(order);
              setPage(1);
            }}
            style={{
              height: 32,
              borderRadius: 10,
              border: '1px solid var(--line-2)',
              background: 'var(--bg-elev)',
              color: 'var(--ink)',
              fontSize: 13,
              padding: '0 10px',
            }}
          >
            <option value="createdAt_DESC">Newest first</option>
            <option value="createdAt_ASC">Oldest first</option>
            <option value="sales_DESC">Bestselling</option>
            <option value="price_ASC">Price ↑</option>
            <option value="price_DESC">Price ↓</option>
            <option value="name_ASC">Name A–Z</option>
          </select>
        </div>
      </div>

      {selected.size > 0 && (() => {
        const visibleSelected = products.filter((p) => selected.has(p.id));
        const selectionStatus = (p: Product) =>
          (p as unknown as { status?: string }).status ?? (effectiveStock(p) === 0 ? 'out' : 'active');
        const hasArchived = tab === 'archived' || visibleSelected.some((p) => selectionStatus(p) === 'archived');
        const hasArchivable = tab !== 'archived' && tab !== 'draft' && visibleSelected.some((p) => {
          const s = selectionStatus(p);
          return s !== 'archived' && s !== 'draft';
        });
        const hasDraft = visibleSelected.some((p) => selectionStatus(p) === 'draft');
        return (
          <div
            className="flex items-center gap-3"
            style={{
              padding: '8px 16px',
              background: 'var(--ink)',
              color: 'var(--bg)',
              borderRadius: 10,
            }}
          >
            <span style={{ fontSize: 13 }}>{selected.size} selected</span>
            <div className="flex-1" />
            {hasDraft && (
              <Button size="xs" variant="ghost" style={{ color: 'var(--bg)', border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => setBulkAction('publish')}>Publish</Button>
            )}
            {hasArchived && (
              <Button size="xs" variant="ghost" style={{ color: 'var(--bg)', border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => setBulkAction('unarchive')}>Unarchive</Button>
            )}
            {hasArchivable && (
              <Button size="xs" variant="ghost" style={{ color: 'var(--bg)', border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => setBulkAction('archive')}>Archive</Button>
            )}
            <Button size="xs" variant="ghost" style={{ color: 'var(--bg)', border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => setBulkAction('delete')}>Delete</Button>
            <Button size="xs" variant="ghost" style={{ color: 'var(--bg)', border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        );
      })()}

      <Card padding={0}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-muted)' }}>
                <th style={{ padding: '10px 16px', width: 36 }}>
                  <input
                    type="checkbox"
                    style={{ accentColor: 'var(--ink)' }}
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                    aria-label={allSelected ? 'Deselect all' : 'Select all'}
                  />
                </th>
                {['Product', 'SKU', 'Status', 'Inventory', 'Price', 'Sales', 'Vendor', ''].map((h) => (
                  <th key={h} style={TH_STYLE}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} style={{ padding: '16px 16px' }}>
                        <div
                          style={{
                            height: 14,
                            background: 'var(--bg-muted)',
                            borderRadius: 4,
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)' }}>
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const img = getPrimaryImage(p.ProductImages || []);
                  const explicit = (p as unknown as { status?: string }).status;
                  const status =
                    explicit === 'archived' || explicit === 'draft'
                      ? explicit
                      : effectiveStock(p) === 0
                      ? 'out'
                      : 'active';
                  const vendor = (p as unknown as { vendor?: string | null }).vendor ?? '—';
                  const sales = (p as unknown as { salesCount?: number }).salesCount ?? 0;
                  const skuLabel = `NX-${String(p.id).padStart(3, '0')}`;
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggleRow(p.id)}
                          style={{ accentColor: 'var(--ink)' }}
                        />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div className="flex items-center gap-3">
                          {img !== '/placeholder.png' ? (
                            <Image
                              src={img}
                              alt={p.name}
                              width={42}
                              height={42}
                              style={{
                                width: 42,
                                height: 42,
                                borderRadius: 8,
                                objectFit: 'cover',
                              }}
                            />
                          ) : (
                            <PlaceholderImg label="" w={42} h={42} style={{ borderRadius: 8 }} />
                          )}
                          <div>
                            <Link
                              href={`/admin/products/${p.id}`}
                              className="product-row-name inline-flex items-center gap-1.5"
                              style={{ color: 'var(--ink)', fontWeight: 500, textDecoration: 'none' }}
                            >
                              <span className="product-row-name__text">{p.name}</span>
                              <I.arr_r size={13} />
                            </Link>
                            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>
                              {p.category ?? 'Uncategorized'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: '14px 16px',
                          fontFamily: 'var(--mono)',
                          fontSize: 12,
                          color: 'var(--ink-3)',
                        }}
                      >
                        {skuLabel}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <Badge tone={STATUS_LABEL[status]?.tone ?? 'neutral'} dot size="sm">
                          {STATUS_LABEL[status]?.label ?? status}
                        </Badge>
                      </td>
                      <td
                        style={{
                          padding: '14px 16px',
                          fontVariantNumeric: 'tabular-nums',
                          color:
                            effectiveStock(p) === 0
                              ? 'var(--danger)'
                              : effectiveStock(p) < 20
                              ? 'var(--warn)'
                              : 'var(--ink)',
                        }}
                      >
                        {effectiveStock(p)}{' '}
                        <span style={{ color: 'var(--ink-4)' }}>units</span>
                      </td>
                      <td
                        style={{
                          padding: '14px 16px',
                          fontVariantNumeric: 'tabular-nums',
                          color: 'var(--ink)',
                        }}
                      >
                        {effectivePriceLabel(p)}
                      </td>
                      <td
                        style={{
                          padding: '14px 16px',
                          fontVariantNumeric: 'tabular-nums',
                          color: 'var(--ink-2)',
                        }}
                      >
                        {sales.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--ink-3)' }}>{vendor}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div className="inline-flex items-center gap-1">
                          <Link href={`/admin/products/${p.id}`}>
                            <IconBtn icon={<I.eye />} variant="ghost" size={28} aria-label="View" />
                          </Link>
                          {isAdmin && (
                            <Link href={`/admin/products/${p.id}/edit`}>
                              <IconBtn icon={<I.edit />} variant="ghost" size={28} aria-label="Edit" />
                            </Link>
                          )}
                          {isAdmin && (
                            <IconBtn
                              icon={<I.trash />}
                              variant="ghost"
                              size={28}
                              aria-label="Delete"
                              onClick={() => setDeleteTarget(p)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {pagination && (
          <div
            className="flex items-center justify-between"
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--line)',
              fontSize: 12.5,
              color: 'var(--ink-3)',
            }}
          >
            <span>
              Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}–
              {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
              {pagination.totalItems}
            </span>
            <div className="flex gap-1">
              <IconBtn
                icon={<I.chev_l />}
                variant="bordered"
                size={28}
                disabled={!pagination.hasPrevPage}
                onClick={() => pagination.hasPrevPage && setPage(pagination.currentPage - 1)}
              />
              <IconBtn
                icon={<I.chev_r />}
                variant="bordered"
                size={28}
                disabled={!pagination.hasNextPage}
                onClick={() => pagination.hasNextPage && setPage(pagination.currentPage + 1)}
              />
            </div>
          </div>
        )}
      </Card>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete product"
        message={`Delete "${deleteTarget?.name}"? This can't be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <ConfirmModal
        open={bulkAction === 'delete'}
        title={`Delete ${selected.size} product${selected.size === 1 ? '' : 's'}`}
        message="This can't be undone."
        confirmLabel="Delete"
        loading={bulkBusy}
        onConfirm={runBulkDelete}
        onClose={() => !bulkBusy && setBulkAction(null)}
      />

      <ConfirmModal
        open={bulkAction === 'archive'}
        title={`Archive ${selected.size} product${selected.size === 1 ? '' : 's'}`}
        message="Archived products are hidden from the storefront. You can restore them later."
        confirmLabel="Archive"
        loading={bulkBusy}
        onConfirm={runBulkArchive}
        onClose={() => !bulkBusy && setBulkAction(null)}
      />

      <ConfirmModal
        open={bulkAction === 'publish'}
        title={`Publish ${selected.size} product${selected.size === 1 ? '' : 's'}`}
        message="These will be set to Active and visible on the storefront."
        confirmLabel="Publish"
        loading={bulkBusy}
        onConfirm={runBulkPublish}
        onClose={() => !bulkBusy && setBulkAction(null)}
      />

      <ConfirmModal
        open={bulkAction === 'unarchive'}
        title={`Unarchive ${selected.size} product${selected.size === 1 ? '' : 's'}`}
        message="These will be set back to Active and visible on the storefront."
        confirmLabel="Unarchive"
        loading={bulkBusy}
        onConfirm={runBulkUnarchive}
        onClose={() => !bulkBusy && setBulkAction(null)}
      />

      <Modal
        open={importOpen}
        title="Import products"
        description={importFileName ? `${importFileName} · ${importRows.length} row${importRows.length === 1 ? '' : 's'}` : undefined}
        onClose={() => !importBusy && setImportOpen(false)}
      >
        <div className="flex flex-col gap-4">
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
            Expected columns: <code>name, description, price, stock, category</code>. Rows with errors will be skipped.
          </div>
          <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: 'var(--bg-muted)' }}>
                  <th style={TH_STYLE}>Row</th>
                  <th style={TH_STYLE}>Name</th>
                  <th style={TH_STYLE}>Price</th>
                  <th style={TH_STYLE}>Stock</th>
                  <th style={TH_STYLE}>Category</th>
                  <th style={TH_STYLE}>Status</th>
                </tr>
              </thead>
              <tbody>
                {importRows.map((r) => (
                  <tr key={r._row} style={{ borderTop: '1px solid var(--line)' }}>
                    <td style={{ padding: '8px 16px', color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>{r._row}</td>
                    <td style={{ padding: '8px 16px' }}>{r.name || <span style={{ color: 'var(--ink-4)' }}>—</span>}</td>
                    <td style={{ padding: '8px 16px', fontVariantNumeric: 'tabular-nums' }}>
                      {Number.isFinite(r.price) ? formatCurrency(r.price) : '—'}
                    </td>
                    <td style={{ padding: '8px 16px', fontVariantNumeric: 'tabular-nums' }}>
                      {Number.isFinite(r.stock) ? r.stock : '—'}
                    </td>
                    <td style={{ padding: '8px 16px', color: 'var(--ink-3)' }}>{r.category || '—'}</td>
                    <td style={{ padding: '8px 16px' }}>
                      {r._error ? (
                        <Badge tone="danger" size="sm">{r._error}</Badge>
                      ) : (
                        <Badge tone="success" dot size="sm">Ready</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
              {importRows.filter((r) => !r._error).length} of {importRows.length} will be created
            </span>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setImportOpen(false)} disabled={importBusy}>Cancel</Button>
              <Button
                variant="primary"
                onClick={runImport}
                loading={importBusy}
                disabled={importRows.filter((r) => !r._error).length === 0}
              >
                Import
              </Button>
            </div>
          </div>
        </div>
      </Modal>

    </div>
  );
}
