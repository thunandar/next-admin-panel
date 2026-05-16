'use client';

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { analyticsApi, type NexusDashboard } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Card from '@/components/ui/Card';
import SectionHead from '@/components/ui/SectionHead';
import Stat from '@/components/ui/Stat';
import Sparkline from '@/components/ui/Sparkline';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import Avatar from '@/components/ui/Avatar';
import PlaceholderImg from '@/components/ui/PlaceholderImg';
import { PageLoader } from '@/components/ui/Spinner';
import { I } from '@/components/ui/Icons';

type Period = 'today' | '7d' | '14d' | '30d' | 'all';

const PERIOD_LABEL: Record<Period, string> = {
  today: 'today',
  '7d': 'last 7 days',
  '14d': 'last 14 days',
  '30d': 'last 30 days',
  all: 'last year',
};

type ItemSize = 'quarter' | 'side' | 'main' | 'full';
type ItemId =
  | 'revenue'
  | 'orders'
  | 'visitors'
  | 'conversion'
  | 'revenue-chart'
  | 'top-products'
  | 'recent-orders'
  | 'activity';

const ITEM_META: Record<ItemId, { title: string; size: ItemSize }> = {
  revenue: { title: 'Revenue', size: 'quarter' },
  orders: { title: 'Orders', size: 'quarter' },
  visitors: { title: 'Visitors', size: 'quarter' },
  conversion: { title: 'Conversion', size: 'quarter' },
  'revenue-chart': { title: 'Revenue chart', size: 'main' },
  'top-products': { title: 'Top products', size: 'side' },
  'recent-orders': { title: 'Recent orders', size: 'main' },
  activity: { title: 'Activity', size: 'side' },
};

const SIZE_COLS: Record<ItemSize, number> = {
  quarter: 3,
  side: 4,
  main: 8,
  full: 12,
};

const DEFAULT_ORDER: ItemId[] = [
  'revenue',
  'orders',
  'visitors',
  'conversion',
  'revenue-chart',
  'top-products',
  'recent-orders',
  'activity',
];

const STORAGE_KEY = 'nexus-dashboard-layout-v2';
const STORAGE_KEY_V1 = 'nexus-dashboard-layout-v1';

function fillMissing(list: unknown[]): ItemId[] {
  const valid = list.filter(
    (id): id is ItemId => typeof id === 'string' && id in ITEM_META,
  );
  DEFAULT_ORDER.forEach((id) => {
    if (!valid.includes(id)) valid.push(id);
  });
  return valid;
}

function migrateFromV1(parsed: unknown): ItemId[] | null {
  // v1 (oldest): an array of widget ids, where 'stats' meant a fixed 4-stat row.
  if (Array.isArray(parsed)) {
    const expanded: unknown[] = [];
    for (const w of parsed) {
      if (w === 'stats') expanded.push('revenue', 'orders', 'visitors', 'conversion');
      else expanded.push(w);
    }
    return fillMissing(expanded);
  }
  // v1 (later): { widgets: WidgetId[], stats: StatId[] }
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as { widgets?: unknown; stats?: unknown };
    const widgets = Array.isArray(obj.widgets) ? obj.widgets : [];
    const stats = Array.isArray(obj.stats) ? obj.stats : ['revenue', 'orders', 'visitors', 'conversion'];
    const expanded: unknown[] = [];
    for (const w of widgets) {
      if (w === 'stats') {
        for (const s of stats) expanded.push(s);
      } else {
        expanded.push(w);
      }
    }
    return fillMissing(expanded);
  }
  return null;
}

function loadOrder(): ItemId[] {
  if (typeof window === 'undefined') return DEFAULT_ORDER;
  try {
    const v2 = window.localStorage.getItem(STORAGE_KEY);
    if (v2) {
      const parsed = JSON.parse(v2);
      if (Array.isArray(parsed)) return fillMissing(parsed);
    }
    const v1 = window.localStorage.getItem(STORAGE_KEY_V1);
    if (v1) {
      const migrated = migrateFromV1(JSON.parse(v1));
      if (migrated) return migrated;
    }
  } catch {
    // fall through
  }
  return DEFAULT_ORDER;
}

function packRows(order: ItemId[]): ItemId[][] {
  const rows: ItemId[][] = [];
  let row: ItemId[] = [];
  let used = 0;
  for (const id of order) {
    const cols = SIZE_COLS[ITEM_META[id].size];
    if (used + cols > 12 && row.length > 0) {
      rows.push(row);
      row = [];
      used = 0;
    }
    row.push(id);
    used += cols;
  }
  if (row.length) rows.push(row);
  return rows;
}

const NOW_GREETING = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const STATUS_TO_TONE: Record<string, 'success' | 'warn' | 'info' | 'neutral' | 'danger'> = {
  delivered: 'success',
  confirmed: 'info',
  shipped: 'info',
  pending: 'warn',
  cancelled: 'danger',
  refunded: 'neutral',
};

function formatCompactMoney(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}

function formatCompactNumber(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return `${v.toFixed(0)}`;
}

function deltaLabel(v: number) {
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

function formatDateTimeShort() {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date());
}

function RevenueChart({ current }: { current: number[] }) {
  const prev = current.map((v) => v * 0.85 - 0.3 * Math.max(1, Math.max(...current)) / 10);
  const W = 740;
  const H = 200;
  const P = 8;
  const max = Math.max(...current, ...prev, 1);
  const x = (i: number, arr: number[]) => P + (i / Math.max(1, arr.length - 1)) * (W - P * 2);
  const y = (v: number) => H - P - (v / max) * (H - P * 2);
  const path = (arr: number[]) =>
    arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i, arr)},${y(v)}`).join(' ');
  const area = (arr: number[]) =>
    `${path(arr)} L${x(arr.length - 1, arr)},${H - P} L${x(0, arr)},${H - P} Z`;
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="rgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--terracotta)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--terracotta)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1={P}
          x2={W - P}
          y1={P + g * (H - P * 2)}
          y2={P + g * (H - P * 2)}
          stroke="var(--line)"
          strokeDasharray="3 4"
        />
      ))}
      <path d={path(prev)} fill="none" stroke="var(--ink-4)" strokeWidth={1.2} strokeDasharray="4 4" />
      <path d={area(current)} fill="url(#rgrad)" />
      <path
        d={path(current)}
        fill="none"
        stroke="var(--terracotta)"
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {current.length > 0 && (
        <circle
          cx={x(current.length - 1, current)}
          cy={y(current[current.length - 1] ?? 0)}
          r="4"
          fill="var(--terracotta)"
          stroke="var(--bg-elev)"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}

function ActivityRow({ a }: { a: NexusDashboard['activity'][number] }) {
  const toneOf = (action: string) => {
    if (/fail|danger|error|banned/i.test(action)) return 'danger';
    if (/create|fulfill|deliver|succes|added/i.test(action)) return 'success';
    if (/low|warn|refund/i.test(action)) return 'warn';
    return 'info';
  };
  const tone = toneOf(a.action);
  const toneColor =
    tone === 'success'
      ? 'var(--success)'
      : tone === 'warn'
        ? 'var(--warn)'
        : tone === 'danger'
          ? 'var(--danger)'
          : 'var(--info)';
  return (
    <div className="flex gap-2.5 items-start" style={{ padding: '10px 16px' }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          marginTop: 6,
          background: toneColor,
        }}
      />
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>
          <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{a.actor}</span>{' '}
          {a.action}{' '}
          <span style={{ color: 'var(--ink)' }}>
            {a.entity} #{a.entityId ?? ''}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
          {new Date(a.createdAt).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}

function DragHandle({ compact, title }: { compact: boolean; title: string }) {
  const dots = (
    <span
      aria-hidden
      style={{
        display: 'inline-grid',
        gridTemplateColumns: 'repeat(2, 3px)',
        gridTemplateRows: 'repeat(3, 3px)',
        gap: 2,
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 3,
            height: 3,
            borderRadius: 999,
            background: 'var(--ink-3)',
          }}
        />
      ))}
    </span>
  );

  if (compact) {
    return (
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 3,
          background: 'var(--bg-elev)',
          border: '1px solid var(--line-strong, var(--line))',
          borderRadius: 6,
          padding: 4,
          pointerEvents: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'inline-flex',
        }}
      >
        {dots}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 3,
        background: 'var(--bg-elev)',
        border: '1px solid var(--line-strong, var(--line))',
        borderRadius: 8,
        padding: '5px 10px 5px 8px',
        fontSize: 11.5,
        fontWeight: 500,
        color: 'var(--ink-2)',
        pointerEvents: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
        letterSpacing: 0.02,
      }}
    >
      {dots}
      {title}
    </div>
  );
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [period, setPeriod] = useState<Period>('14d');
  const [data, setData] = useState<NexusDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [order, setOrder] = useState<ItemId[]>(DEFAULT_ORDER);
  const [editing, setEditing] = useState(false);
  const [dragId, setDragId] = useState<ItemId | null>(null);
  const [overId, setOverId] = useState<ItemId | null>(null);

  useEffect(() => {
    // Hydrate saved layout from localStorage after mount to avoid SSR mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrder(loadOrder());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  }, [order]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    analyticsApi
      .getNexusDashboard(period)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, period]);

  const exportOrdersCsv = () => {
    if (!data) return;
    const rows: string[][] = [
      ['Order', 'Customer', 'Email', 'Total', 'Status', 'Date'],
      ...data.recentOrders.map((o) => [
        `#${o.id}`,
        o.user?.name ?? '',
        o.user?.email ?? '',
        Number(o.totalAmount).toFixed(2),
        o.status,
        new Date(o.createdAt).toISOString(),
      ]),
    ];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const revenueSeries = useMemo(() => data?.series.revenue.map((p) => p.value) ?? [], [data]);
  const ordersSeries = useMemo(() => data?.series.orders.map((p) => p.value) ?? [], [data]);
  const visitorsSeries = useMemo(() => data?.series.visitors.map((p) => p.value) ?? [], [data]);

  const rows = useMemo(() => packRows(order), [order]);

  const moveTo = (from: ItemId, to: ItemId) => {
    if (from === to) return;
    setOrder((prev) => {
      const a = prev.indexOf(from);
      const b = prev.indexOf(to);
      if (a < 0 || b < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(a, 1) as [ItemId];
      next.splice(b, 0, moved);
      return next;
    });
  };

  const wrapStyle = (id: ItemId): CSSProperties => {
    const isDragging = dragId === id;
    const isOver = overId === id && dragId !== null && dragId !== id;
    return {
      position: 'relative',
      borderRadius: 16,
      transition: 'opacity 120ms ease, transform 120ms ease',
      opacity: isDragging ? 0.4 : 1,
      transform: isOver ? 'translateY(-1px)' : undefined,
      outline: isOver ? '2px solid var(--terracotta)' : undefined,
      outlineOffset: 4,
      cursor: editing ? (isDragging ? 'grabbing' : 'grab') : 'auto',
      gridColumn: `span ${SIZE_COLS[ITEM_META[id].size]}`,
      minWidth: 0,
    };
  };

  const dragProps = (id: ItemId) => {
    if (!editing) return {};
    return {
      draggable: true,
      onDragStart: (e: ReactDragEvent<HTMLDivElement>) => {
        setDragId(id);
        e.dataTransfer.effectAllowed = 'move';
        try {
          e.dataTransfer.setData('text/plain', id);
        } catch {
          // ignore
        }
      },
      onDragOver: (e: ReactDragEvent<HTMLDivElement>) => {
        if (!dragId || dragId === id) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (overId !== id) setOverId(id);
      },
      onDragLeave: () => {
        if (overId === id) setOverId(null);
      },
      onDrop: (e: ReactDragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (dragId) moveTo(dragId, id);
        setDragId(null);
        setOverId(null);
      },
      onDragEnd: () => {
        setDragId(null);
        setOverId(null);
      },
    };
  };

  if (loading) return <PageLoader />;
  if (error || !data) {
    return (
      <div style={{ padding: '48px 32px' }}>
        <Card>
          <div className="t-h3" style={{ marginBottom: 6 }}>
            Couldn&apos;t load dashboard
          </div>
          <p className="t-body">Check your connection and refresh.</p>
        </Card>
      </div>
    );
  }

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const renderItem = (id: ItemId): ReactNode => {
    switch (id) {
      case 'revenue':
        return (
          <Stat
            label="Revenue"
            value={formatCompactMoney(data.stats.revenue.value)}
            delta={deltaLabel(data.stats.revenue.delta)}
            sparkline={<Sparkline data={revenueSeries} color="var(--terracotta)" />}
          />
        );
      case 'orders':
        return (
          <Stat
            label="Orders"
            value={data.stats.orders.value.toString()}
            delta={deltaLabel(data.stats.orders.delta)}
            sparkline={<Sparkline data={ordersSeries} color="var(--sage)" />}
          />
        );
      case 'visitors':
        return (
          <Stat
            label="Visitors"
            value={formatCompactNumber(data.stats.visitors.value)}
            delta={deltaLabel(data.stats.visitors.delta)}
            sparkline={<Sparkline data={visitorsSeries} color="var(--info)" />}
          />
        );
      case 'conversion':
        return (
          <Stat
            label="Conversion"
            value={data.stats.conversion.value.toFixed(2)}
            suffix="%"
            delta={deltaLabel(data.stats.conversion.delta)}
            sparkline={
              <Sparkline
                data={ordersSeries.map((o, i) =>
                  visitorsSeries[i] ? (o / visitorsSeries[i]) * 100 : 0,
                )}
                color="var(--ink-4)"
              />
            }
          />
        );

      case 'revenue-chart':
        return (
          <Card padding={24}>
            <div className="flex items-baseline justify-between" style={{ marginBottom: 16 }}>
              <div>
                <div className="t-micro" style={{ color: 'var(--ink-3)', marginBottom: 4 }}>
                  Revenue · {PERIOD_LABEL[period]}
                </div>
                <div className="flex items-baseline gap-3">
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 32, color: 'var(--ink)' }}>
                    {formatCompactMoney(data.stats.revenue.value)}
                  </span>
                  <Badge tone={data.stats.revenue.delta >= 0 ? 'success' : 'danger'} size="sm" dot>
                    {deltaLabel(data.stats.revenue.delta)} vs prev
                  </Badge>
                </div>
              </div>
              <div className="flex gap-3.5" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                <span className="flex items-center gap-1.5">
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--terracotta)' }} />
                  Revenue
                </span>
                <span className="flex items-center gap-1.5">
                  <span style={{ width: 8, height: 2, background: 'var(--ink-4)' }} />
                  Last period
                </span>
              </div>
            </div>
            <RevenueChart current={revenueSeries.length ? revenueSeries : [0]} />
          </Card>
        );

      case 'top-products':
        return (
          <Card padding={0}>
            <div
              style={{
                padding: '20px 20px 12px',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <div className="t-micro" style={{ color: 'var(--ink-3)', marginBottom: 4 }}>
                Top products
              </div>
              <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>By units sold, this window</div>
            </div>
            {data.topProducts.slice(0, 5).map((tp, i) => (
              <div
                key={tp.product.id}
                className="flex items-center gap-3"
                style={{
                  padding: '12px 20px',
                  borderBottom:
                    i < data.topProducts.slice(0, 5).length - 1 ? '1px solid var(--line)' : 'none',
                }}
              >
                <PlaceholderImg label="" w={36} h={36} style={{ borderRadius: 8 }} />
                <div className="flex-1 min-w-0">
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--ink)',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {tp.product.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                    {tp.totalSold} sold · ${Number(tp.product.price).toFixed(2)}
                  </div>
                </div>
                <Sparkline
                  data={[3, 4, 5, 4, 6, 7, 8, 9].map((v) => v + (i % 3))}
                  color="var(--sage)"
                  w={48}
                  h={18}
                />
              </div>
            ))}
            {data.topProducts.length === 0 && (
              <div style={{ padding: 20, fontSize: 13, color: 'var(--ink-4)' }}>No sales yet.</div>
            )}
          </Card>
        );

      case 'recent-orders':
        return (
          <Card padding={0}>
            <div
              className="flex items-center justify-between"
              style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)' }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>Recent orders</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                  {data.stats.orders.value} in window
                </div>
              </div>
              <Link href="/admin/orders">
                <Button variant="ghost" size="sm" iconRight={<I.arr_r />}>
                  View all
                </Button>
              </Link>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-muted)' }}>
                  {['Order', 'Customer', 'Total', 'Status', 'Date'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '10px 20px',
                        fontSize: 11.5,
                        fontWeight: 500,
                        color: 'var(--ink-3)',
                        textTransform: 'uppercase',
                        letterSpacing: 0.04,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((o) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td
                      style={{
                        padding: '12px 20px',
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
                    <td style={{ padding: '12px 20px' }}>
                      <div className="flex items-center gap-2">
                        <Avatar name={o.user?.name ?? '—'} size={22} />
                        <span style={{ color: 'var(--ink)' }}>{o.user?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '12px 20px',
                        fontVariantNumeric: 'tabular-nums',
                        color: 'var(--ink)',
                      }}
                    >
                      ${Number(o.totalAmount).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <Badge tone={STATUS_TO_TONE[o.status] ?? 'neutral'} dot size="sm">
                        {o.status}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 20px', color: 'var(--ink-3)' }}>
                      {new Date(o.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
                {data.recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)' }}>
                      No orders yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        );

      case 'activity':
        return (
          <Card padding={0}>
            <div
              className="flex items-center justify-between"
              style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)' }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>Activity</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Recent</div>
              </div>
              <Link href="/admin/audit-logs">
                <Button variant="ghost" size="sm" iconRight={<I.arr_r />}>
                  View all
                </Button>
              </Link>
            </div>
            <div style={{ padding: '8px 4px' }}>
              {data.activity.map((a) => (
                <ActivityRow key={a.id} a={a} />
              ))}
              {data.activity.length === 0 && (
                <div style={{ padding: 16, fontSize: 13, color: 'var(--ink-4)' }}>
                  Nothing to show yet.
                </div>
              )}
            </div>
          </Card>
        );
    }
  };

  const renderWrapped = (id: ItemId) => {
    const meta = ITEM_META[id];
    const compact = meta.size === 'quarter';
    return (
      <div key={id} style={wrapStyle(id)} {...dragProps(id)}>
        {editing && <DragHandle compact={compact} title={meta.title} />}
        <div
          style={{
            pointerEvents: editing ? 'none' : 'auto',
            opacity: editing && dragId !== id ? 0.85 : 1,
            transition: 'opacity 120ms ease',
          }}
        >
          {renderItem(id)}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHead
        eyebrow={formatDateTimeShort()}
        title={`${NOW_GREETING()}, ${firstName}`}
        sub={
          editing
            ? 'Drag any card anywhere. Cards reflow into rows by size — your layout is saved automatically.'
            : `Revenue is pacing ${deltaLabel(data.stats.revenue.delta)} vs. last period. ${data.stats.orders.value} ${data.stats.orders.value === 1 ? 'order' : 'orders'} in the window.`
        }
        right={
          editing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                icon={<I.refresh />}
                onClick={() => setOrder(DEFAULT_ORDER)}
              >
                Reset
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<I.check />}
                onClick={() => setEditing(false)}
              >
                Done
              </Button>
            </>
          ) : (
            <>
              <Tabs<Period>
                tabs={[
                  { value: 'today', label: 'Today' },
                  { value: '7d', label: '7d' },
                  { value: '14d', label: '14d' },
                  { value: '30d', label: '30d' },
                  { value: 'all', label: 'All' },
                ]}
                value={period}
                onChange={setPeriod}
              />
              <Button
                variant="secondary"
                size="sm"
                icon={<I.download />}
                onClick={exportOrdersCsv}
                disabled={!data || data.recentOrders.length === 0}
              >
                Export
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<I.grid />}
                onClick={() => setEditing(true)}
              >
                Edit layout
              </Button>
              <Link href="/admin/products/new">
                <Button variant="primary" size="sm" icon={<I.plus />}>
                  New product
                </Button>
              </Link>
            </>
          )
        }
      />

      {rows.map((row, idx) => (
        <div
          key={`row-${idx}-${row.join('-')}`}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: 16,
            alignItems: 'stretch',
          }}
        >
          {row.map((id) => renderWrapped(id))}
        </div>
      ))}
    </div>
  );
}
