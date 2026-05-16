'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ordersApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from '@/lib/constants';
import { buildCsv, downloadCsv } from '@/lib/csv';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import SectionHead from '@/components/ui/SectionHead';
import Tabs from '@/components/ui/Tabs';
import Button, { IconBtn } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Avatar from '@/components/ui/Avatar';
import { I } from '@/components/ui/Icons';
import ManualOrderModal from '@/components/admin/ManualOrderModal';
import OrderDetailModal from '@/components/admin/OrderDetailModal';
import type { Order, Pagination as PaginationType } from '@/types';

type Tab = 'all' | 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

type AdvFilters = {
  dateFrom: string;
  dateTo: string;
  minTotal: string;
  maxTotal: string;
};

const EMPTY_FILTERS: AdvFilters = { dateFrom: '', dateTo: '', minTotal: '', maxTotal: '' };

function countActive(f: AdvFilters): number {
  return (f.dateFrom ? 1 : 0) + (f.dateTo ? 1 : 0) + (f.minTotal ? 1 : 0) + (f.maxTotal ? 1 : 0);
}

const STATUS_TONE = ORDER_STATUS_TONE;
const STATUS_LABEL = ORDER_STATUS_LABEL;

function ordersToCsv(orders: Order[]): string {
  const header = [
    'Order ID',
    'Date',
    'Customer Name',
    'Customer Email',
    'Items',
    'Total',
    'Status',
    'Shipping Address',
    'Notes',
  ];
  const rows = orders.map((o) => [
    `#${o.id}`,
    new Date(o.createdAt).toISOString(),
    o.user?.name ?? '',
    o.user?.email ?? '',
    o.items?.reduce((n, it) => n + (it.quantity ?? 0), 0) ?? 0,
    Number(o.totalAmount).toFixed(2),
    STATUS_LABEL[o.status],
    o.shippingAddress ?? '',
    o.notes ?? '',
  ]);
  return buildCsv(header, rows);
}

const TH_STYLE: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 16px',
  fontSize: 11.5,
  fontWeight: 500,
  color: 'var(--ink-3)',
  textTransform: 'uppercase',
  letterSpacing: 0.04,
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState<AdvFilters>(EMPTY_FILTERS);
  const [manualOpen, setManualOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  const activeCount = countActive(filters);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    const statusFilter = tab === 'all' ? undefined : tab;
    const label = tab === 'all' ? 'orders' : `${tab} orders`;
    const toastId = toast.loading(`Preparing ${label} export…`);
    try {
      const pageSize = 100;
      const all: Order[] = [];
      let current = 1;
      let totalPages = 1;
      do {
        // eslint-disable-next-line no-await-in-loop -- paginated fetch, sequential by design
        const res = await ordersApi.getAll(current, pageSize, statusFilter);
        all.push(...res.orders);
        totalPages = res.totalPages || 1;
        current += 1;
      } while (current <= totalPages);

      if (all.length === 0) {
        toast.error('No orders to export', { id: toastId });
        return;
      }

      const date = new Date().toISOString().slice(0, 10);
      downloadCsv(`orders-${tab}-${date}.csv`, ordersToCsv(all));
      toast.success(`Exported ${all.length} ${all.length === 1 ? 'order' : 'orders'}`, { id: toastId });
    } catch {
      toast.error('Export failed', { id: toastId });
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets loading/error on page/tab refetch
    setLoading(true);
    setError(false);
    const statusFilter = tab === 'all' ? undefined : tab;
    ordersApi
      .getAll(page, 10, statusFilter)
      .then((res) => {
        if (cancelled) return;
        setOrders(res.orders);
        setPagination({
          currentPage: res.currentPage,
          totalPages: res.totalPages,
          totalItems: res.totalOrders,
          itemsPerPage: 10,
          hasNextPage: res.currentPage < res.totalPages,
          hasPrevPage: res.currentPage > 1,
        });
      })
      .catch(() => {
        if (cancelled) return;
        toast.error('Failed to load orders');
        setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, tab, refreshTick]);

  const fromMs = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`).getTime() : null;
  const toMs = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`).getTime() : null;
  const minT = filters.minTotal ? Number(filters.minTotal) : null;
  const maxT = filters.maxTotal ? Number(filters.maxTotal) : null;

  const filtered = orders.filter((o) => {
    if (search) {
      const q = search.toLowerCase();
      const matches =
        String(o.id).includes(search) ||
        o.user?.name?.toLowerCase().includes(q) ||
        o.user?.email?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    const created = new Date(o.createdAt).getTime();
    if (fromMs != null && created < fromMs) return false;
    if (toMs != null && created > toMs) return false;
    const total = Number(o.totalAmount);
    if (minT != null && !Number.isNaN(minT) && total < minT) return false;
    if (maxT != null && !Number.isNaN(maxT) && total > maxT) return false;
    return true;
  });

  const counts = {
    pending: orders.filter((o) => o.status === 'pending').length,
    confirmed: orders.filter((o) => o.status === 'confirmed').length,
    shipped: orders.filter((o) => o.status === 'shipped').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  };

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHead
        title="Orders"
        sub={`${pagination?.totalItems ?? 0} total orders.`}
        right={
          <>
            <Button variant="secondary" size="sm" icon={<I.download />} onClick={handleExport} disabled={exporting || loading}>
              {exporting ? 'Exporting…' : 'Export'}
            </Button>
            <Button variant="primary" size="sm" icon={<I.plus />} onClick={() => setManualOpen(true)}>Manual order</Button>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {(
          [
            { k: 'Pending', v: counts.pending, tone: 'warn' },
            { k: 'Paid', v: counts.confirmed, tone: 'info' },
            { k: 'Shipped', v: counts.shipped, tone: 'sage' },
            { k: 'Delivered', v: counts.delivered, tone: 'success' },
            { k: 'Cancelled', v: counts.cancelled, tone: 'danger' },
          ] as const
        ).map((s) => (
          <div
            key={s.k}
            className="flex items-center gap-3.5"
            style={{
              padding: 16,
              background: 'var(--bg-elev)',
              border: '1px solid var(--line)',
              borderRadius: 12,
            }}
          >
            <div
              style={{
                width: 8,
                height: 36,
                borderRadius: 4,
                background:
                  s.tone === 'warn'
                    ? 'var(--warn)'
                    : s.tone === 'info'
                      ? 'var(--info)'
                      : s.tone === 'sage'
                        ? 'var(--sage)'
                        : 'var(--danger)',
              }}
            />
            <div>
              <div
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 28,
                  color: 'var(--ink)',
                  lineHeight: 1,
                }}
              >
                {s.v}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>{s.k}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Tabs<Tab>
          tabs={[
            { value: 'all', label: 'All', count: pagination?.totalItems },
            { value: 'pending', label: 'Pending' },
            { value: 'confirmed', label: 'Paid' },
            { value: 'shipped', label: 'Shipped' },
            { value: 'delivered', label: 'Delivered' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
          value={tab}
          onChange={(v) => {
            setTab(v);
            setPage(1);
          }}
        />
        <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
          <div style={{ width: 200 }}>
            <Input
              inputSize="sm"
              icon={<I.search />}
              placeholder="Search orders"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ width: 130 }}>
            <Input
              inputSize="sm"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              aria-label="From date"
            />
          </div>
          <div style={{ width: 130 }}>
            <Input
              inputSize="sm"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              aria-label="To date"
            />
          </div>
          <div style={{ width: 90 }}>
            <Input
              inputSize="sm"
              type="number"
              min={0}
              step="0.01"
              placeholder="Min"
              value={filters.minTotal}
              onChange={(e) => setFilters((f) => ({ ...f, minTotal: e.target.value }))}
              aria-label="Minimum total"
            />
          </div>
          <div style={{ width: 90 }}>
            <Input
              inputSize="sm"
              type="number"
              min={0}
              step="0.01"
              placeholder="Max"
              value={filters.maxTotal}
              onChange={(e) => setFilters((f) => ({ ...f, maxTotal: e.target.value }))}
              aria-label="Maximum total"
            />
          </div>
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <Card padding={0}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-muted)' }}>
                {['Order', 'Date', 'Customer', 'Items', 'Total', 'Status', ''].map((h) => (
                  <th key={h} style={TH_STYLE}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading || error ? (
                <tr>
                  <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)' }}>
                    {error ? 'Failed to load orders' : 'Loading…'}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)' }}>
                    No orders.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr
                    key={o.id}
                    style={{ borderBottom: '1px solid var(--line)', cursor: 'pointer' }}
                    onClick={() => setDetailOrder(o)}
                  >
                    <td
                      style={{
                        padding: '14px 16px',
                        fontFamily: 'var(--mono)',
                        fontSize: 12,
                        color: 'var(--ink)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span>#{o.id}</span>
                        {o.placedById && (
                          <span
                            title={o.placedBy ? `Created by ${o.placedBy.name}` : 'Manually created'}
                            style={{
                              fontFamily: 'var(--sans)',
                              fontSize: 10,
                              fontWeight: 500,
                              letterSpacing: 0.04,
                              textTransform: 'uppercase',
                              padding: '2px 7px',
                              borderRadius: 999,
                              background: 'var(--bg-muted)',
                              color: 'var(--ink-3)',
                              border: '1px solid var(--line-2)',
                            }}
                          >
                            Manual
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--ink-3)' }}>
                      {new Date(o.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div className="flex items-center gap-2">
                        <Avatar name={o.user?.name ?? '—'} size={26} />
                        <div>
                          <div style={{ color: 'var(--ink)' }}>{o.user?.name ?? '—'}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{o.user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--ink-2)' }}>
                      {o.items?.length ?? 0}
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        fontVariantNumeric: 'tabular-nums',
                        color: 'var(--ink)',
                        fontWeight: 500,
                      }}
                    >
                      {formatCurrency(o.totalAmount)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <Badge tone={STATUS_TONE[o.status]} dot size="sm">
                        {STATUS_LABEL[o.status]}
                      </Badge>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <IconBtn
                        icon={<I.chev_r />}
                        variant="ghost"
                        size={28}
                        aria-label={`View order #${o.id}`}
                        onClick={() => setDetailOrder(o)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
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
              Showing page {pagination.currentPage} of {pagination.totalPages}
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

      <ManualOrderModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onCreated={() => {
          setTab('all');
          setPage(1);
          setRefreshTick((n) => n + 1);
        }}
      />

      <OrderDetailModal
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
        onUpdated={(updated) => {
          setOrders((prev) => prev.map((x) => (x.id === updated.id ? { ...x, status: updated.status } : x)));
        }}
      />
    </div>
  );
}
