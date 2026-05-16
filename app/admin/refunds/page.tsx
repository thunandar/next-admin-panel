'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { refundsApi, type Refund } from '@/lib/api';
import Card from '@/components/ui/Card';
import SectionHead from '@/components/ui/SectionHead';
import Stat from '@/components/ui/Stat';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import { PageLoader } from '@/components/ui/Spinner';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_TONE: Record<Refund['status'], 'warn' | 'success' | 'danger'> = {
  pending: 'warn',
  approved: 'success',
  rejected: 'danger',
};

function fmtMoney(v: string | number) {
  const n = Number(v);
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [stats, setStats] = useState<{ approvedAmount: number; pendingAmount: number; count: number } | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refresh = async (status: StatusFilter = filter) => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([
        refundsApi.list(status === 'all' ? {} : { status }),
        refundsApi.stats(),
      ]);
      setRefunds(list.refunds);
      setStats(s);
    } catch {
      toast.error('Failed to load refunds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh(filter);
    // refresh is recreated each render; depending on it would loop. The
    // current `filter` is the only real input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const submitRefund = async () => {
    if (!orderId || !amount) return;
    setSubmitting(true);
    try {
      await refundsApi.create({
        orderId: Number(orderId),
        amount: Number(amount),
        reason: reason || undefined,
      });
      toast.success('Refund created');
      setCreating(false);
      setOrderId('');
      setAmount('');
      setReason('');
      refresh();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create refund';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await refundsApi.setStatus(id, status);
      toast.success(status === 'approved' ? 'Refund approved' : 'Refund rejected');
      refresh();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Update failed';
      toast.error(msg);
    }
  };

  if (loading && !refunds.length) return <PageLoader />;

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHead
        eyebrow="Customer ops"
        title="Refunds"
        sub="Issue partial or full refunds against orders. Pending refunds wait for approval before they count against the order total."
        right={
          <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
            New refund
          </Button>
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <Stat label="Approved" value={stats ? fmtMoney(stats.approvedAmount) : '—'} />
        <Stat
          label="Pending"
          value={stats ? fmtMoney(stats.pendingAmount) : '—'}
          delta={stats?.pendingAmount ? 'Needs review' : undefined}
        />
        <Stat label="Total refund records" value={String(stats?.count ?? 0)} />
      </div>

      <Card padding={0}>
        <div
          className="flex items-center justify-between"
          style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)' }}
        >
          <Tabs<StatusFilter>
            tabs={[
              { value: 'all', label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
            ]}
            value={filter}
            onChange={setFilter}
          />
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-muted)' }}>
              {['Refund', 'Order', 'Customer', 'Amount', 'Reason', 'Status', 'Issued', ''].map((h, i) => (
                <th
                  key={`h-${i}`}
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
            {refunds.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '12px 20px', fontFamily: 'var(--mono)', fontSize: 12 }}>#{r.id}</td>
                <td style={{ padding: '12px 20px', fontFamily: 'var(--mono)', fontSize: 12 }}>
                  #{r.orderId}
                </td>
                <td style={{ padding: '12px 20px' }}>
                  {r.order?.user ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={r.order.user.name} size={22} />
                      <span style={{ color: 'var(--ink)' }}>{r.order.user.name}</span>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--ink-4)' }}>—</span>
                  )}
                </td>
                <td style={{ padding: '12px 20px', fontVariantNumeric: 'tabular-nums', color: 'var(--ink)' }}>
                  {fmtMoney(r.amount)}
                </td>
                <td style={{ padding: '12px 20px', color: 'var(--ink-2)', maxWidth: 240 }}>
                  <span
                    style={{
                      display: 'block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={r.reason ?? ''}
                  >
                    {r.reason || '—'}
                  </span>
                </td>
                <td style={{ padding: '12px 20px' }}>
                  <Badge tone={STATUS_TONE[r.status]} dot size="sm">
                    {r.status}
                  </Badge>
                </td>
                <td style={{ padding: '12px 20px', color: 'var(--ink-3)' }}>
                  {new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </td>
                <td style={{ padding: '12px 20px' }}>
                  {r.status === 'pending' && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => updateStatus(r.id, 'approved')}>
                        Approve
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => updateStatus(r.id, 'rejected')}>
                        Reject
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {refunds.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)' }}>
                  {filter === 'all' ? 'No refunds yet.' : `No ${filter} refunds.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Modal open={creating} onClose={() => setCreating(false)} title="Issue a refund">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Order ID" hint="The order being refunded">
            <Input
              type="number"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="e.g. 142"
            />
          </Field>
          <Field label="Amount" hint="Cannot exceed remaining order total">
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 49.99"
            />
          </Field>
          <Field label="Reason (optional)">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Damaged on arrival"
            />
          </Field>
          <div className="flex gap-2 justify-end" style={{ marginTop: 8 }}>
            <Button variant="ghost" onClick={() => setCreating(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submitRefund} disabled={submitting || !orderId || !amount}>
              {submitting ? 'Creating…' : 'Create refund'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
