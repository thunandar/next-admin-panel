'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { abandonedCheckoutsApi, type AbandonedCheckout } from '@/lib/api';
import Card from '@/components/ui/Card';
import SectionHead from '@/components/ui/SectionHead';
import Stat from '@/components/ui/Stat';
import Avatar from '@/components/ui/Avatar';
import { PageLoader } from '@/components/ui/Spinner';

function fmtMoney(v: string | number) {
  const n = Number(v);
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function AbandonedCartsPage() {
  const [checkouts, setCheckouts] = useState<AbandonedCheckout[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    abandonedCheckoutsApi
      .list({ minAgeMinutes: 60, limit: 50 })
      .then((d) => {
        if (cancelled) return;
        setCheckouts(d.checkouts);
        setTotal(d.totalCheckouts);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load abandoned carts');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <PageLoader />;

  const totalValue = checkouts.reduce((s, c) => s + Number(c.totalAmount), 0);

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHead
        eyebrow="Recovery"
        title="Abandoned carts"
        sub="Visitors who reached checkout in the last 30 days but never placed an order. Reach out before they forget."
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <Stat label="Open carts" value={String(total)} delta="Older than 1h" />
        <Stat label="Potential value" value={fmtMoney(totalValue)} delta="Showing on this page" />
      </div>

      <Card padding={0}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-muted)' }}>
              {['Customer', 'Items', 'Value', 'Started', 'Contact'].map((h) => (
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
            {checkouts.map((c) => {
              const itemCount = (c.items ?? []).reduce((s, i) => s + Number(i.quantity || 0), 0);
              const email = c.user?.email ?? c.email;
              const displayName = c.user?.name ?? (c.email ? c.email.split('@')[0] : 'Guest');
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '12px 20px' }}>
                    <div className="flex items-center gap-2">
                      <Avatar name={displayName} size={26} />
                      <div>
                        <div style={{ color: 'var(--ink)', fontWeight: 500 }}>{displayName}</div>
                        {email && (
                          <div style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>{email}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 20px', color: 'var(--ink-2)' }}>
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </td>
                  <td style={{ padding: '12px 20px', fontVariantNumeric: 'tabular-nums', color: 'var(--ink)' }}>
                    {fmtMoney(c.totalAmount)}
                  </td>
                  <td style={{ padding: '12px 20px', color: 'var(--ink-3)' }}>
                    {fmtRelative(c.createdAt)}
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    {email ? (
                      <a
                        href={`mailto:${email}?subject=Still%20thinking%20it%20over%3F`}
                        style={{ color: 'var(--terracotta)', fontSize: 12.5 }}
                      >
                        Email →
                      </a>
                    ) : (
                      <span style={{ color: 'var(--ink-4)' }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {checkouts.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)' }}>
                  No abandoned carts. Either everyone&apos;s checking out or no one&apos;s reached checkout yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
