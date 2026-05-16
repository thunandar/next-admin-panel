'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { ordersApi } from '@/lib/api';
import { formatCurrency, getApiErrorMessage } from '@/lib/utils';
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from '@/lib/constants';
import type { Address, Order } from '@/types';

interface OrderDetailModalProps {
  order: Order | null;
  onClose: () => void;
  onUpdated: (order: Order) => void;
}

const STATUS_TONE = ORDER_STATUS_TONE;
const STATUS_LABEL = ORDER_STATUS_LABEL;

const STATUS_ACCENT: Record<Order['status'], string> = {
  pending: 'var(--warn)',
  confirmed: 'var(--info)',
  shipped: 'var(--sage)',
  delivered: 'var(--success)',
  cancelled: 'var(--danger)',
};

const STATUS_OPTIONS: Order['status'][] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

const EYEBROW: React.CSSProperties = {
  fontSize: 10.5,
  letterSpacing: 0.08,
  textTransform: 'uppercase',
  color: 'var(--ink-3)',
  fontWeight: 500,
  marginBottom: 8,
};

export default function OrderDetailModal({ order, onClose, onUpdated }: OrderDetailModalProps) {
  const [nextStatus, setNextStatus] = useState<Order['status']>(order?.status ?? 'pending');
  const [saving, setSaving] = useState(false);
  const [address, setAddress] = useState<Address | null>(null);

  // The list endpoint omits the joined Address; fetch the full order on open.
  useEffect(() => {
    if (!order) {
      setAddress(null);
      return;
    }
    if (!order.shippingAddressId) {
      setAddress(null);
      return;
    }
    let cancelled = false;
    ordersApi
      .getById(order.id)
      .then((full) => {
        if (!cancelled) setAddress(full.address ?? null);
      })
      .catch(() => {
        if (!cancelled) setAddress(null);
      });
    return () => {
      cancelled = true;
    };
  }, [order]);

  if (!order) return null;

  const itemsTotal = order.items?.reduce((sum, it) => sum + Number(it.price) * it.quantity, 0) ?? 0;
  const dirty = nextStatus !== order.status;
  const locked = order.status === 'cancelled';
  const itemCount = order.items?.length ?? 0;

  async function save() {
    if (!order || !dirty || saving) return;
    setSaving(true);
    try {
      const updated = await ordersApi.updateStatus(order.id, nextStatus);
      toast.success(`Order #${order.id} → ${STATUS_LABEL[updated.status]}`);
      onUpdated({ ...order, status: updated.status });
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update status'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={!!order}
      size="lg"
      title={`Order #${order.id}`}
      description={
        new Date(order.createdAt).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }) +
        (order.placedById
          ? ` · Manually created${order.placedBy ? ` by ${order.placedBy.name}` : ''}`
          : '')
      }
      onClose={onClose}
    >
      <div className="flex flex-col" style={{ gap: 22 }}>
        {/* Status row */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: '12px 14px',
            borderRadius: 10,
            background: 'var(--bg-muted)',
            border: '1px solid var(--line)',
            borderLeft: `3px solid ${STATUS_ACCENT[order.status]}`,
          }}
        >
          <div className="flex items-center gap-2.5">
            <Badge tone={STATUS_TONE[order.status]} dot size="sm">
              {STATUS_LABEL[order.status]}
            </Badge>
            <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 24,
              color: 'var(--ink)',
              lineHeight: 1,
            }}
          >
            {formatCurrency(order.totalAmount)}
          </div>
        </div>

        {/* Customer */}
        <section>
          <div style={EYEBROW}>Customer</div>
          <div className="flex items-center gap-3">
            <Avatar name={order.user?.name ?? '—'} size={36} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: 'var(--ink)', fontSize: 14 }}>{order.user?.name ?? '—'}</div>
              <div style={{ color: 'var(--ink-3)', fontSize: 12.5 }}>{order.user?.email ?? '—'}</div>
            </div>
          </div>
        </section>

        {/* Items */}
        <section>
          <div style={EYEBROW}>Items</div>
          <div>
            {(order.items ?? []).map((it, idx) => (
              <div
                key={it.id}
                className="flex items-center gap-3"
                style={{
                  padding: '12px 0',
                  borderTop: idx === 0 ? '1px solid var(--line)' : 'none',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: 'var(--bg-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--ink-3)',
                    fontSize: 12,
                    fontFamily: 'var(--mono)',
                    flexShrink: 0,
                  }}
                >
                  {it.quantity}×
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: 'var(--ink)' }}>
                    {it.product?.name ?? `Product #${it.productId}`}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    {formatCurrency(it.price)} each
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--ink)',
                  }}
                >
                  {formatCurrency(Number(it.price) * it.quantity)}
                </div>
              </div>
            ))}
            {itemCount === 0 && (
              <div style={{ padding: 12, fontSize: 12.5, color: 'var(--ink-4)' }}>No items.</div>
            )}
          </div>

          {/* Totals — minimal, total in serif */}
          <div className="flex flex-col" style={{ marginTop: 12, gap: 4 }}>
            <Row label="Subtotal" value={formatCurrency(itemsTotal)} />
            {Number(order.totalAmount) - itemsTotal !== 0 && (
              <Row
                label="Shipping & tax"
                value={formatCurrency(Math.max(0, Number(order.totalAmount) - itemsTotal))}
              />
            )}
            <div
              className="flex items-center justify-between"
              style={{
                marginTop: 8,
                paddingTop: 10,
                borderTop: '1px solid var(--line)',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Total</span>
              <span
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 22,
                  color: 'var(--ink)',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
          </div>
        </section>

        {/* Address + Notes */}
        {(address || order.notes) && (
          <section
            className="grid"
            style={{
              gridTemplateColumns: address && order.notes ? '1fr 1fr' : '1fr',
              gap: 20,
            }}
          >
            {address && (
              <div>
                <div style={EYEBROW}>Ship to</div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                  <div style={{ color: 'var(--ink)', fontWeight: 500 }}>{address.name}</div>
                  <div>
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ''}
                  </div>
                  <div>
                    {address.city}
                    {address.region ? `, ${address.region}` : ''} {address.postal}
                  </div>
                  <div>{address.country}</div>
                  {address.phone && (
                    <div style={{ color: 'var(--ink-3)', marginTop: 4 }}>{address.phone}</div>
                  )}
                </div>
              </div>
            )}
            {order.notes && (
              <div>
                <div style={EYEBROW}>Notes</div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {order.notes}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Status changer — segmented chips */}
        <section>
          <div style={EYEBROW}>Update status</div>
          <div
            className="flex flex-wrap"
            style={{ gap: 6, opacity: locked ? 0.5 : 1 }}
          >
            {STATUS_OPTIONS.map((s) => {
              const active = nextStatus === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => !locked && setNextStatus(s)}
                  disabled={locked}
                  style={{
                    height: 32,
                    padding: '0 14px',
                    borderRadius: 999,
                    fontSize: 12.5,
                    fontWeight: 500,
                    cursor: locked ? 'not-allowed' : 'pointer',
                    background: active ? 'var(--ink)' : 'var(--bg-elev)',
                    color: active ? 'var(--bg)' : 'var(--ink-2)',
                    border: `1px solid ${active ? 'var(--ink)' : 'var(--line-2)'}`,
                    transition: 'all 120ms',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: active ? 'var(--bg)' : STATUS_ACCENT[s],
                      display: 'inline-block',
                    }}
                  />
                  {STATUS_LABEL[s]}
                </button>
              );
            })}
          </div>
          {locked && (
            <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 8 }}>
              Cancelled orders cannot be updated.
            </div>
          )}
        </section>

        {/* Footer */}
        <div
          className="flex justify-end gap-2"
          style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}
        >
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} loading={saving} disabled={!dirty || locked}>
            Save changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between" style={{ fontSize: 13, color: 'var(--ink-3)' }}>
      <span>{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ink-2)' }}>{value}</span>
    </div>
  );
}
