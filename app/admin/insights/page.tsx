'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { analyticsApi, type OwnerInsights } from '@/lib/api';
import Card from '@/components/ui/Card';
import SectionHead from '@/components/ui/SectionHead';
import Stat from '@/components/ui/Stat';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { PageLoader } from '@/components/ui/Spinner';
import { I } from '@/components/ui/Icons';
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from '@/lib/constants';

type StatusKey = keyof typeof ORDER_STATUS_LABEL;

const STATUS_ORDER: StatusKey[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

function fmtMoneyCompact(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}

function fmtMoney(v: number) {
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(v: number) {
  return `${v.toFixed(1)}%`;
}

function fmtRelative(iso: string | null) {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return 'today';
  if (diff < 2 * day) return 'yesterday';
  if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`;
  if (diff < 365 * day) return `${Math.floor(diff / (30 * day))}mo ago`;
  return `${Math.floor(diff / (365 * day))}y ago`;
}

function MonthlyBars({
  data,
  color,
  formatValue,
}: {
  data: Array<{ month: string; value: number }>;
  color: string;
  formatValue: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, padding: '8px 0' }}>
      {data.map((d) => {
        const h = (d.value / max) * 140;
        return (
          <div
            key={d.month}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}
          >
            <div
              title={`${d.month}: ${formatValue(d.value)}`}
              style={{
                width: '100%',
                height: Math.max(2, h),
                background: color,
                borderRadius: 4,
                transition: 'opacity 120ms ease',
                opacity: d.value === 0 ? 0.25 : 1,
              }}
            />
            <div
              style={{
                fontSize: 10,
                color: 'var(--ink-4)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                width: '100%',
                textAlign: 'center',
              }}
            >
              {d.month.split(' ')[0]}
            </div>
          </div>
        );
      })}
      {data.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--ink-4)', padding: 16 }}>No data yet.</div>
      )}
    </div>
  );
}

function StatusDistribution({ rows }: { rows: OwnerInsights['orderStatus'] }) {
  const byStatus = new Map(rows.map((r) => [r.status, r.count]));
  const total = rows.reduce((s, r) => s + r.count, 0) || 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          display: 'flex',
          height: 10,
          borderRadius: 999,
          overflow: 'hidden',
          background: 'var(--bg-muted)',
        }}
      >
        {STATUS_ORDER.map((s) => {
          const n = byStatus.get(s) ?? 0;
          if (n === 0) return null;
          const tone = ORDER_STATUS_TONE[s];
          const colorVar =
            tone === 'success'
              ? 'var(--success)'
              : tone === 'warn'
                ? 'var(--warn)'
                : tone === 'danger'
                  ? 'var(--danger)'
                  : tone === 'sage'
                    ? 'var(--sage)'
                    : 'var(--info)';
          return (
            <div
              key={s}
              title={`${ORDER_STATUS_LABEL[s]}: ${n}`}
              style={{ width: `${(n / total) * 100}%`, background: colorVar }}
            />
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
        {STATUS_ORDER.map((s) => {
          const n = byStatus.get(s) ?? 0;
          return (
            <div key={s} className="flex items-center justify-between" style={{ fontSize: 12.5 }}>
              <Badge tone={ORDER_STATUS_TONE[s]} dot size="sm">
                {ORDER_STATUS_LABEL[s]}
              </Badge>
              <span style={{ color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{n}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const [data, setData] = useState<OwnerInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    analyticsApi
      .getOwnerInsights()
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
  }, []);

  const revenueBars = useMemo(
    () => data?.revenueByMonth.map((r) => ({ month: r.month, value: r.revenue })) ?? [],
    [data],
  );
  const userBars = useMemo(
    () => data?.newUsersByMonth.map((r) => ({ month: r.month, value: r.count })) ?? [],
    [data],
  );

  if (loading) return <PageLoader />;
  if (error || !data) {
    return (
      <div style={{ padding: '48px 32px' }}>
        <Card>
          <div className="t-h3" style={{ marginBottom: 6 }}>
            Couldn&apos;t load insights
          </div>
          <p className="t-body">Check your connection and refresh.</p>
        </Card>
      </div>
    );
  }

  const { kpis } = data;

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHead
        eyebrow="Owner view"
        title="Insights"
        sub="The numbers behind the storefront. Customer value, fulfillment health, inventory exposure, and growth trends."
        right={
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="sm" iconRight={<I.arr_r />}>
              Operational dashboard
            </Button>
          </Link>
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}
      >
        <Stat
          label="Avg order value"
          value={fmtMoneyCompact(kpis.avgOrderValue)}
          delta={`${kpis.paidOrders} paid orders`}
        />
        <Stat
          label="Gross profit"
          value={fmtMoneyCompact(kpis.grossProfit)}
          delta={`${fmtPct(kpis.grossMarginPct)} margin`}
        />
        <Stat
          label="Repeat customers"
          value={fmtPct(kpis.repeatRate)}
          delta={`${kpis.repeatCustomers} of ${kpis.totalCustomers}`}
        />
        <Stat
          label="Fulfillment rate"
          value={fmtPct(kpis.fulfillmentRate)}
          delta={`${kpis.totalOrders} total orders`}
        />
        <Stat
          label="Inventory value"
          value={fmtMoneyCompact(kpis.inventoryValue)}
          delta={`${kpis.inventoryUnits.toLocaleString()} units`}
        />
        <Stat
          label="Refunds (approved)"
          value={fmtMoneyCompact(data.refunds.approvedAmount)}
          delta={
            data.refunds.pendingCount
              ? `${data.refunds.pendingCount} pending · ${fmtMoneyCompact(data.refunds.pendingAmount)}`
              : 'None pending'
          }
        />
        <Stat
          label="Abandoned carts"
          value={data.abandoned.count.toString()}
          delta={`${fmtMoneyCompact(data.abandoned.value)} unrecovered`}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>
        <div style={{ gridColumn: 'span 8' }}>
          <Card padding={24}>
            <div className="flex items-baseline justify-between" style={{ marginBottom: 12 }}>
              <div>
                <div className="t-micro" style={{ color: 'var(--ink-3)', marginBottom: 4 }}>
                  Revenue · last 12 months
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--ink)' }}>
                  {fmtMoneyCompact(kpis.totalRevenue)}
                </div>
              </div>
              <Badge tone="accent" size="sm">
                Lifetime paid
              </Badge>
            </div>
            <MonthlyBars data={revenueBars} color="var(--terracotta)" formatValue={fmtMoneyCompact} />
          </Card>
        </div>

        <div style={{ gridColumn: 'span 4' }}>
          <Card padding={24}>
            <div className="t-micro" style={{ color: 'var(--ink-3)', marginBottom: 12 }}>
              Order status mix
            </div>
            <StatusDistribution rows={data.orderStatus} />
          </Card>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>
        <div style={{ gridColumn: 'span 7' }}>
          <Card padding={0}>
            <div
              className="flex items-center justify-between"
              style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)' }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>Top customers</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                  By lifetime spend
                </div>
              </div>
              <Link href="/admin/users">
                <Button variant="ghost" size="sm" iconRight={<I.arr_r />}>
                  All users
                </Button>
              </Link>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-muted)' }}>
                  {['Customer', 'Orders', 'Spent', 'Last order'].map((h) => (
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
                {data.topCustomers.map((c, i) => (
                  <tr key={c.user?.id ?? `unknown-${i}`} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '12px 20px' }}>
                      <div className="flex items-center gap-2">
                        <Avatar name={c.user?.name ?? '—'} size={26} />
                        <div className="min-w-0">
                          <div style={{ color: 'var(--ink)', fontWeight: 500 }}>
                            {c.user?.name ?? 'Unknown'}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>
                            {c.user?.email ?? ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px', fontVariantNumeric: 'tabular-nums', color: 'var(--ink-2)' }}>
                      {c.orderCount}
                    </td>
                    <td style={{ padding: '12px 20px', fontVariantNumeric: 'tabular-nums', color: 'var(--ink)' }}>
                      {fmtMoney(c.totalSpent)}
                    </td>
                    <td style={{ padding: '12px 20px', color: 'var(--ink-3)' }}>
                      {fmtRelative(c.lastOrderAt)}
                    </td>
                  </tr>
                ))}
                {data.topCustomers.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)' }}>
                      No paid orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>

        <div style={{ gridColumn: 'span 5' }}>
          <Card padding={0}>
            <div
              className="flex items-center justify-between"
              style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)' }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>Low stock</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                  At or under {kpis.lowStockThreshold} units
                </div>
              </div>
              {data.lowStock.length > 0 && (
                <Badge tone="warn" dot size="sm">
                  {data.lowStock.length} need attention
                </Badge>
              )}
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {data.lowStock.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/admin/products/${p.id}`}
                  className="flex items-center gap-3"
                  style={{
                    padding: '12px 20px',
                    borderBottom: i < data.lowStock.length - 1 ? '1px solid var(--line)' : 'none',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
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
                      {p.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                      {fmtMoney(p.price)}
                    </div>
                  </div>
                  <Badge tone={p.stock === 0 ? 'danger' : 'warn'} size="sm" dot>
                    {p.stock === 0 ? 'Out' : `${p.stock} left`}
                  </Badge>
                </Link>
              ))}
              {data.lowStock.length === 0 && (
                <div style={{ padding: 20, fontSize: 13, color: 'var(--ink-4)' }}>
                  All tracked products are above threshold.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>
        <div style={{ gridColumn: 'span 6' }}>
          <Card padding={24}>
            <div className="flex items-baseline justify-between" style={{ marginBottom: 12 }}>
              <div>
                <div className="t-micro" style={{ color: 'var(--ink-3)', marginBottom: 4 }}>
                  New users · last 12 months
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--ink)' }}>
                  {userBars.reduce((s, r) => s + r.value, 0).toLocaleString()}
                </div>
              </div>
              <Badge tone="info" size="sm">
                Growth
              </Badge>
            </div>
            <MonthlyBars data={userBars} color="var(--info)" formatValue={(v) => v.toLocaleString()} />
          </Card>
        </div>

        <div style={{ gridColumn: 'span 6' }}>
          <Card padding={0}>
            <div
              style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)' }}
            >
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>Top profit drivers</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                Margin = (sale price − cost) per unit · only products with cost set
              </div>
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {data.margin.byProduct.slice(0, 8).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between"
                  style={{ padding: '10px 20px', borderBottom: '1px solid var(--line)', fontSize: 12.5 }}
                >
                  <span
                    style={{
                      color: 'var(--ink-2)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      flex: 1,
                      minWidth: 0,
                      marginRight: 12,
                    }}
                  >
                    {p.name}
                  </span>
                  <span
                    style={{ color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', marginRight: 12 }}
                  >
                    {fmtMoney(p.profit)}
                  </span>
                  <Badge tone={p.marginPct >= 50 ? 'success' : p.marginPct >= 25 ? 'sage' : 'warn'} size="sm">
                    {fmtPct(p.marginPct)}
                  </Badge>
                </div>
              ))}
              {data.margin.byProduct.length === 0 && (
                <div style={{ padding: 16, fontSize: 12.5, color: 'var(--ink-4)' }}>
                  Add a Cost per item to products to surface margin here.
                </div>
              )}
            </div>
          </Card>
        </div>

        <div style={{ gridColumn: 'span 6' }}>
          <Card padding={0}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>Traffic by source</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                Last 30 days · UTM source, then referrer host, then direct
              </div>
            </div>
            <div style={{ padding: '8px 0' }}>
              {(() => {
                const total = data.trafficSources.reduce((s, t) => s + t.views, 0) || 1;
                return data.trafficSources.map((t) => {
                  const pct = (t.views / total) * 100;
                  return (
                    <div key={t.source} style={{ padding: '8px 20px' }}>
                      <div className="flex items-center justify-between" style={{ fontSize: 12.5, marginBottom: 4 }}>
                        <span style={{ color: 'var(--ink-2)' }}>{t.source}</span>
                        <span style={{ color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                          {t.views.toLocaleString()} · {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div
                        style={{
                          height: 4,
                          borderRadius: 999,
                          background: 'var(--bg-muted)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: 'var(--info)',
                          }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
              {data.trafficSources.length === 0 && (
                <div style={{ padding: 16, fontSize: 12.5, color: 'var(--ink-4)' }}>
                  No views recorded yet. Add ?utm_source=… to your shared links to track campaigns.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>
        <div style={{ gridColumn: 'span 6' }}>
          <Card padding={0}>
            <div
              style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)' }}
            >
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>Most loved</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                What shoppers wishlist and view most
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              <div style={{ borderRight: '1px solid var(--line)' }}>
                <div
                  className="t-micro"
                  style={{ padding: '12px 16px 8px', color: 'var(--ink-4)' }}
                >
                  Wishlisted
                </div>
                {data.mostWishlisted.map((w, i) => (
                  <div
                    key={w.product?.id ?? `wl-${i}`}
                    className="flex items-center justify-between"
                    style={{ padding: '8px 16px', fontSize: 12.5 }}
                  >
                    <span
                      style={{
                        color: 'var(--ink-2)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginRight: 8,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {w.product?.name ?? '—'}
                    </span>
                    <span style={{ color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                      {w.wishlistCount}
                    </span>
                  </div>
                ))}
                {data.mostWishlisted.length === 0 && (
                  <div style={{ padding: 16, fontSize: 12.5, color: 'var(--ink-4)' }}>—</div>
                )}
              </div>
              <div>
                <div
                  className="t-micro"
                  style={{ padding: '12px 16px 8px', color: 'var(--ink-4)' }}
                >
                  Viewed
                </div>
                {data.mostViewed.map((v, i) => (
                  <div
                    key={v.product?.id ?? `view-${i}`}
                    className="flex items-center justify-between"
                    style={{ padding: '8px 16px', fontSize: 12.5 }}
                  >
                    <span
                      style={{
                        color: 'var(--ink-2)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginRight: 8,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {v.product?.name ?? '—'}
                    </span>
                    <span style={{ color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                      {v.viewCount}
                    </span>
                  </div>
                ))}
                {data.mostViewed.length === 0 && (
                  <div style={{ padding: 16, fontSize: 12.5, color: 'var(--ink-4)' }}>—</div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
