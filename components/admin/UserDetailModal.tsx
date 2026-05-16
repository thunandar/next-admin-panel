'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { usersApi } from '@/lib/api';
import { formatCurrency, getApiErrorMessage } from '@/lib/utils';
import type { Address, User } from '@/types';

interface UserDetailModalProps {
  user: User | null;
  currentUserId?: number;
  isSuperAdmin: boolean;
  onClose: () => void;
  onUpdated: (user: User) => void;
}

type Status = NonNullable<User['status']>;
type Role = User['role'];

const STATUS_TONE: Record<Status, 'success' | 'danger'> = {
  active: 'success',
  banned: 'danger',
};

const STATUS_LABEL: Record<Status, string> = {
  active: 'Active',
  banned: 'Banned',
};

const STATUS_ACCENT: Record<Status, string> = {
  active: 'var(--success)',
  banned: 'var(--danger)',
};

const STATUS_OPTIONS: Status[] = ['active', 'banned'];

const ROLE_LABEL: Record<Role, string> = {
  super_admin: 'Admin · Owner',
  admin: 'Admin · Support',
  user: 'Customer',
};

const ROLE_OPTIONS: Role[] = ['user', 'admin', 'super_admin'];

const EYEBROW: React.CSSProperties = {
  fontSize: 10.5,
  letterSpacing: 0.08,
  textTransform: 'uppercase',
  color: 'var(--ink-3)',
  fontWeight: 500,
  marginBottom: 8,
};

export default function UserDetailModal({
  user,
  currentUserId,
  isSuperAdmin,
  onClose,
  onUpdated,
}: UserDetailModalProps) {
  const initialStatus: Status = user?.status ?? 'active';
  const initialRole: Role = user?.role ?? 'user';

  const [nextStatus, setNextStatus] = useState<Status>(initialStatus);
  const [nextRole, setNextRole] = useState<Role>(initialRole);
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState<Address[] | null>(null);

  useEffect(() => {
    setNextStatus(initialStatus);
    setNextRole(initialRole);
  }, [user?.id, initialStatus, initialRole]);

  // Fetch the user's saved address book on open. The list endpoint omits it.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) {
      setAddresses(null);
      return;
    }
    let cancelled = false;
    setAddresses(null);
    usersApi
      .getById(userId)
      .then((res) => {
        if (!cancelled) setAddresses(res.data.addresses ?? []);
      })
      .catch(() => {
        if (!cancelled) setAddresses([]);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const dirty = useMemo(
    () => nextStatus !== initialStatus || nextRole !== initialRole,
    [nextStatus, nextRole, initialStatus, initialRole],
  );

  if (!user) return null;

  const isSelf = currentUserId === user.id;
  const roleLocked = !isSuperAdmin || isSelf;
  const isCustomer = initialRole === 'user';

  async function save() {
    if (!user || !dirty || saving) return;
    setSaving(true);
    try {
      const payload: Partial<Pick<User, 'role' | 'status'>> = {};
      if (nextStatus !== initialStatus) payload.status = nextStatus;
      if (nextRole !== initialRole) payload.role = nextRole;

      const updated = await usersApi.update(user.id, payload);
      toast.success(`${updated.name} updated.`);
      onUpdated(updated);
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update user'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={!!user}
      size="lg"
      title={user.name}
      description={`${user.email} · U-${String(user.id).padStart(4, '0')}`}
      onClose={onClose}
    >
      <div className="flex flex-col" style={{ gap: 22 }}>
        {/* Identity row */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: '12px 14px',
            borderRadius: 10,
            background: 'var(--bg-muted)',
            border: '1px solid var(--line)',
            borderLeft: `3px solid ${STATUS_ACCENT[initialStatus]}`,
          }}
        >
          <div className="flex items-center gap-3">
            <Avatar name={user.name} size={36} />
            <div>
              <div style={{ color: 'var(--ink)', fontSize: 14, fontWeight: 500 }}>{user.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{ROLE_LABEL[initialRole]}</div>
            </div>
          </div>
          <Badge tone={STATUS_TONE[initialStatus]} dot size="sm">
            {STATUS_LABEL[initialStatus]}
          </Badge>
        </div>

        {/* Stats */}
        <section
          className="grid"
          style={{ gridTemplateColumns: isCustomer ? '1fr 1fr' : '1fr', gap: 20 }}
        >
          <Stat
            label="Joined"
            value={new Date(user.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          />
          {isCustomer && (
            <Stat label="Lifetime spend" value={formatCurrency(user.lifetimeSpend ?? 0)} />
          )}
        </section>

        {/* Saved addresses (customers only) */}
        {isCustomer && (
          <Section title="Saved addresses">
            {addresses === null ? (
              <div style={{ fontSize: 12.5, color: 'var(--ink-4)' }}>Loading…</div>
            ) : addresses.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--ink-4)' }}>No saved addresses.</div>
            ) : (
              <div className="flex flex-col" style={{ gap: 10 }}>
                {addresses.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid var(--line)',
                      borderRadius: 10,
                      background: 'var(--bg-elev)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{a.name}</div>
                      {a.isDefault && <Badge tone="sage" size="sm">Default</Badge>}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.55, marginTop: 3 }}>
                      <div>
                        {a.line1}
                        {a.line2 ? `, ${a.line2}` : ''}
                      </div>
                      <div>
                        {a.city}
                        {a.region ? `, ${a.region}` : ''} {a.postal} · {a.country}
                      </div>
                      {a.phone && <div>{a.phone}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Status */}
        <Section title="Status">
          <Chips<Status>
            options={STATUS_OPTIONS}
            value={nextStatus}
            onChange={setNextStatus}
            label={(s) => STATUS_LABEL[s]}
            dot={(s) => STATUS_ACCENT[s]}
          />
        </Section>

        {/* Role */}
        <Section
          title="Role"
          hint={
            isSelf
              ? "You can't change your own role."
              : !isSuperAdmin
              ? 'Only owners can change roles.'
              : undefined
          }
        >
          <Chips<Role>
            options={ROLE_OPTIONS}
            value={nextRole}
            onChange={setNextRole}
            label={(r) => ROLE_LABEL[r]}
            disabled={roleLocked}
          />
        </Section>

        {/* Footer */}
        <div
          className="flex justify-end gap-2"
          style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}
        >
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} loading={saving} disabled={!dirty}>
            Save changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div style={EYEBROW}>{title}</div>
      {children}
      {hint && (
        <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 8 }}>{hint}</div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={EYEBROW}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  );
}

interface ChipsProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label: (option: T) => string;
  dot?: (option: T) => string;
  disabled?: boolean;
}

function Chips<T extends string>({ options, value, onChange, label, dot, disabled }: ChipsProps<T>) {
  return (
    <div className="flex flex-wrap" style={{ gap: 6, opacity: disabled ? 0.5 : 1 }}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => !disabled && onChange(opt)}
            disabled={disabled}
            style={{
              height: 32,
              padding: '0 14px',
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: disabled ? 'not-allowed' : 'pointer',
              background: active ? 'var(--ink)' : 'var(--bg-elev)',
              color: active ? 'var(--bg)' : 'var(--ink-2)',
              border: `1px solid ${active ? 'var(--ink)' : 'var(--line-2)'}`,
              transition: 'all 120ms',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {dot && (
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: active ? 'var(--bg)' : dot(opt),
                  display: 'inline-block',
                }}
              />
            )}
            {label(opt)}
          </button>
        );
      })}
    </div>
  );
}
