'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import Button, { IconBtn } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Field from '@/components/ui/Field';
import Avatar from '@/components/ui/Avatar';
import { I } from '@/components/ui/Icons';
import { ordersApi, productsApi, usersApi } from '@/lib/api';
import { formatCurrency, getApiErrorMessage } from '@/lib/utils';
import type { Order, Product, User } from '@/types';

interface ManualOrderModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (order: Order) => void;
}

interface LineItem {
  product: Product;
  quantity: number;
}

const SHIPPING_OPTIONS = [
  { value: 'standard', label: 'Standard (free)' },
  { value: 'express', label: 'Express (+$18)' },
  { value: 'overnight', label: 'Overnight (+$32)' },
] as const;

const SHIPPING_RATES: Record<string, number> = { standard: 0, express: 18, overnight: 32 };
const TAX_RATE = 0.08;

const SELECT_STYLE: React.CSSProperties = {
  height: 38,
  width: '100%',
  padding: '0 12px',
  borderRadius: 10,
  border: '1px solid var(--line-2)',
  background: 'var(--bg-elev)',
  color: 'var(--ink)',
  fontSize: 14,
};

export default function ManualOrderModal({ open, onClose, onCreated }: ManualOrderModalProps) {
  const [customer, setCustomer] = useState<User | null>(null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<User[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [showCustomerResults, setShowCustomerResults] = useState(false);

  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [productSearching, setProductSearching] = useState(false);
  const [showProductResults, setShowProductResults] = useState(false);

  const [items, setItems] = useState<LineItem[]>([]);
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingMethod, setShippingMethod] = useState<string>('standard');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const customerBoxRef = useRef<HTMLDivElement>(null);
  const productBoxRef = useRef<HTMLDivElement>(null);

  function reset() {
    setCustomer(null);
    setCustomerQuery('');
    setCustomerResults([]);
    setProductQuery('');
    setProductResults([]);
    setItems([]);
    setShippingAddress('');
    setShippingMethod('standard');
    setNotes('');
    setSubmitting(false);
  }

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  // Customer search (debounced)
  useEffect(() => {
    if (!open) return;
    const term = customerQuery.trim();
    if (term.length < 2) {
      setCustomerResults([]);
      return;
    }
    let cancelled = false;
    setCustomerSearching(true);
    const t = setTimeout(() => {
      usersApi
        .getAll({ search: term, role: 'user', limit: 8 })
        .then((res) => {
          if (cancelled) return;
          setCustomerResults(res.data);
        })
        .catch(() => {
          if (cancelled) return;
          setCustomerResults([]);
        })
        .finally(() => {
          if (!cancelled) setCustomerSearching(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [customerQuery, open]);

  // Product search (debounced)
  useEffect(() => {
    if (!open) return;
    const term = productQuery.trim();
    if (term.length < 2) {
      setProductResults([]);
      return;
    }
    let cancelled = false;
    setProductSearching(true);
    const t = setTimeout(() => {
      productsApi
        .search(term, 1, 8)
        .then((res) => {
          if (cancelled) return;
          setProductResults(res.data);
        })
        .catch(() => {
          if (cancelled) return;
          setProductResults([]);
        })
        .finally(() => {
          if (!cancelled) setProductSearching(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [productQuery, open]);

  // Close popovers on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (customerBoxRef.current && !customerBoxRef.current.contains(t)) setShowCustomerResults(false);
      if (productBoxRef.current && !productBoxRef.current.contains(t)) setShowProductResults(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  function pickCustomer(u: User) {
    setCustomer(u);
    setCustomerQuery('');
    setShowCustomerResults(false);
  }

  function addProduct(p: Product) {
    setItems((prev) => {
      const existing = prev.find((it) => it.product.id === p.id);
      if (existing) {
        return prev.map((it) =>
          it.product.id === p.id ? { ...it, quantity: it.quantity + 1 } : it,
        );
      }
      return [...prev, { product: p, quantity: 1 }];
    });
    setProductQuery('');
    setShowProductResults(false);
  }

  function setQty(productId: number, qty: number) {
    setItems((prev) =>
      prev.map((it) => (it.product.id === productId ? { ...it, quantity: Math.max(1, qty) } : it)),
    );
  }

  function removeItem(productId: number) {
    setItems((prev) => prev.filter((it) => it.product.id !== productId));
  }

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, it) => sum + Number(it.product.price) * it.quantity, 0);
    const shipping = SHIPPING_RATES[shippingMethod] ?? 0;
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + shipping + tax) * 100) / 100;
    return { subtotal, shipping, tax, total };
  }, [items, shippingMethod]);

  const canSubmit = !!customer && items.length > 0 && !submitting;

  async function handleSubmit() {
    if (!customer || items.length === 0) {
      toast.error('Pick a customer and at least one product');
      return;
    }
    const overstocked = items.find((it) => it.quantity > it.product.stock);
    if (overstocked) {
      toast.error(`Only ${overstocked.product.stock} in stock for ${overstocked.product.name}`);
      return;
    }
    setSubmitting(true);
    try {
      const order = await ordersApi.create({
        userId: customer.id,
        items: items.map((it) => ({ productId: it.product.id, quantity: it.quantity })),
        shippingAddress: shippingAddress.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success(`Order #${order.id} created for ${customer.name}`);
      onCreated(order);
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to create order'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} title="Create manual order" description="Place an order on a customer's behalf." onClose={onClose}>
      <div className="flex flex-col gap-5">
        {/* Customer */}
        <Field label="Customer" required>
          {customer ? (
            <div
              className="flex items-center justify-between"
              style={{
                padding: 10,
                background: 'var(--bg-muted)',
                border: '1px solid var(--line)',
                borderRadius: 10,
              }}
            >
              <div className="flex items-center gap-2.5">
                <Avatar name={customer.name} size={32} />
                <div>
                  <div style={{ color: 'var(--ink)', fontSize: 13.5 }}>{customer.name}</div>
                  <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>{customer.email}</div>
                </div>
              </div>
              <IconBtn
                icon={<I.x />}
                variant="ghost"
                size={28}
                aria-label="Clear customer"
                onClick={() => setCustomer(null)}
              />
            </div>
          ) : (
            <div ref={customerBoxRef} style={{ position: 'relative' }}>
              <Input
                inputSize="sm"
                icon={<I.search />}
                placeholder="Search by name or email"
                value={customerQuery}
                onChange={(e) => {
                  setCustomerQuery(e.target.value);
                  setShowCustomerResults(true);
                }}
                onFocus={() => setShowCustomerResults(true)}
              />
              {showCustomerResults && customerQuery.trim().length >= 2 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    background: 'var(--bg-elev)',
                    border: '1px solid var(--line)',
                    borderRadius: 10,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                    zIndex: 10,
                    maxHeight: 240,
                    overflowY: 'auto',
                  }}
                >
                  {customerSearching ? (
                    <div style={{ padding: 12, fontSize: 12.5, color: 'var(--ink-4)' }}>Searching…</div>
                  ) : customerResults.length === 0 ? (
                    <div style={{ padding: 12, fontSize: 12.5, color: 'var(--ink-4)' }}>No customers found.</div>
                  ) : (
                    customerResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => pickCustomer(u)}
                        className="flex items-center gap-2.5 w-full text-left"
                        style={{
                          padding: '8px 12px',
                          borderBottom: '1px solid var(--line)',
                          background: 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        <Avatar name={u.name} size={28} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: 'var(--ink)' }}>{u.name}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{u.email}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </Field>

        {/* Products */}
        <Field label="Products" required>
          <div ref={productBoxRef} style={{ position: 'relative' }}>
            <Input
              inputSize="sm"
              icon={<I.search />}
              placeholder="Search products to add"
              value={productQuery}
              onChange={(e) => {
                setProductQuery(e.target.value);
                setShowProductResults(true);
              }}
              onFocus={() => setShowProductResults(true)}
            />
            {showProductResults && productQuery.trim().length >= 2 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 4,
                  background: 'var(--bg-elev)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                  zIndex: 10,
                  maxHeight: 240,
                  overflowY: 'auto',
                }}
              >
                {productSearching ? (
                  <div style={{ padding: 12, fontSize: 12.5, color: 'var(--ink-4)' }}>Searching…</div>
                ) : productResults.length === 0 ? (
                  <div style={{ padding: 12, fontSize: 12.5, color: 'var(--ink-4)' }}>No products found.</div>
                ) : (
                  productResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProduct(p)}
                      disabled={p.stock <= 0}
                      className="flex items-center justify-between w-full text-left"
                      style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--line)',
                        background: 'transparent',
                        cursor: p.stock <= 0 ? 'not-allowed' : 'pointer',
                        opacity: p.stock <= 0 ? 0.5 : 1,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: 'var(--ink)' }}>{p.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                          {formatCurrency(p.price)} · {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
                        </div>
                      </div>
                      <I.plus size={16} />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div
              style={{
                marginTop: 10,
                border: '1px solid var(--line)',
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              {items.map((it, idx) => (
                <div
                  key={it.product.id}
                  className="flex items-center gap-3"
                  style={{
                    padding: '10px 12px',
                    borderBottom: idx === items.length - 1 ? 'none' : '1px solid var(--line)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--ink)' }}>{it.product.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                      {formatCurrency(it.product.price)} · {it.product.stock} in stock
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconBtn
                      icon={<I.minus />}
                      variant="bordered"
                      size={26}
                      aria-label="Decrease quantity"
                      onClick={() => setQty(it.product.id, it.quantity - 1)}
                      disabled={it.quantity <= 1}
                    />
                    <input
                      type="number"
                      min={1}
                      max={it.product.stock}
                      value={it.quantity}
                      onChange={(e) => setQty(it.product.id, Number(e.target.value) || 1)}
                      style={{
                        width: 48,
                        height: 26,
                        textAlign: 'center',
                        border: '1px solid var(--line-2)',
                        borderRadius: 6,
                        background: 'var(--bg-elev)',
                        fontSize: 13,
                        color: 'var(--ink)',
                      }}
                    />
                    <IconBtn
                      icon={<I.plus />}
                      variant="bordered"
                      size={26}
                      aria-label="Increase quantity"
                      onClick={() => setQty(it.product.id, it.quantity + 1)}
                      disabled={it.quantity >= it.product.stock}
                    />
                  </div>
                  <div
                    style={{
                      width: 80,
                      textAlign: 'right',
                      fontSize: 13,
                      fontVariantNumeric: 'tabular-nums',
                      color: 'var(--ink)',
                    }}
                  >
                    {formatCurrency(Number(it.product.price) * it.quantity)}
                  </div>
                  <IconBtn
                    icon={<I.trash />}
                    variant="ghost"
                    size={28}
                    aria-label="Remove item"
                    onClick={() => removeItem(it.product.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </Field>

        {/* Shipping & notes */}
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Shipping method">
            <select
              style={SELECT_STYLE}
              value={shippingMethod}
              onChange={(e) => setShippingMethod(e.target.value)}
            >
              {SHIPPING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Shipping address">
            <Input
              inputSize="md"
              placeholder="Street, city, postal code"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Notes">
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional internal notes"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid var(--line-2)',
              background: 'var(--bg-elev)',
              color: 'var(--ink)',
              fontSize: 14,
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </Field>

        {/* Totals */}
        <div
          style={{
            padding: 12,
            background: 'var(--bg-muted)',
            borderRadius: 10,
            fontSize: 13,
          }}
        >
          <Row label="Subtotal" value={formatCurrency(totals.subtotal)} />
          <Row label="Shipping" value={formatCurrency(totals.shipping)} />
          <Row label={`Tax (${Math.round(TAX_RATE * 100)}%)`} value={formatCurrency(totals.tax)} />
          <div
            className="flex items-center justify-between"
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: '1px solid var(--line)',
              fontWeight: 500,
              color: 'var(--ink)',
            }}
          >
            <span>Total</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totals.total)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting} disabled={!canSubmit}>
            Create order
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: '2px 0', color: 'var(--ink-2)' }}>
      <span>{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}
