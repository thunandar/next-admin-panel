'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { buildCsv, downloadCsv } from '@/lib/csv';
import Badge from '@/components/ui/Badge';
import Button, { IconBtn } from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import SectionHead from '@/components/ui/SectionHead';
import Tabs from '@/components/ui/Tabs';
import Input from '@/components/ui/Input';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import Field from '@/components/ui/Field';
import { I } from '@/components/ui/Icons';
import UserDetailModal from '@/components/admin/UserDetailModal';
import type { Pagination as PaginationType, User } from '@/types';

type Tab = 'all' | 'customers' | 'staff' | 'banned';
type StatusFilter = '' | 'active' | 'banned';

interface AdvancedFilters {
  status: StatusFilter;
  joinedAfter: string;
}

const EMPTY_FILTERS: AdvancedFilters = { status: '', joinedAfter: '' };

const ROLE_LABEL: Record<User['role'], string> = {
  super_admin: 'Admin · Owner',
  admin: 'Admin · Support',
  user: 'Customer',
};

const STATUS_TONE: Record<NonNullable<User['status']>, 'success' | 'danger'> = {
  active: 'success',
  banned: 'danger',
};

const TH_STYLE: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 16px',
  fontSize: 11.5,
  fontWeight: 500,
  color: 'var(--ink-3)',
  textTransform: 'uppercase',
  letterSpacing: 0.04,
};

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

function usersToCsv(users: User[]): string {
  const header = ['User ID', 'Name', 'Email', 'Role', 'Status', 'Lifetime Spend', 'Joined'];
  const rows = users.map((u) => [
    `U-${String(u.id).padStart(4, '0')}`,
    u.name,
    u.email,
    ROLE_LABEL[u.role],
    u.status ?? 'active',
    Number(u.lifetimeSpend ?? 0).toFixed(2),
    new Date(u.createdAt).toISOString(),
  ]);
  return buildCsv(header, rows);
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [advanced, setAdvanced] = useState<AdvancedFilters>(EMPTY_FILTERS);

  const [exporting, setExporting] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [invite, setInvite] = useState({ name: '', email: '', password: '', role: 'admin' as 'admin' | 'super_admin' });
  const [detailUser, setDetailUser] = useState<User | null>(null);

  const advancedCount = useMemo(
    () => Object.values(advanced).filter((v) => v !== '').length,
    [advanced],
  );

  const buildApiFilters = useCallback(
    (targetPage: number, limit: number) => {
      const role = tab === 'customers' ? 'user' : tab === 'staff' ? 'admin,super_admin' : undefined;
      return {
        page: targetPage,
        limit,
        ...(role ? { role } : {}),
        ...(search ? { search } : {}),
      };
    },
    [tab, search],
  );

  const applyClientFilters = useCallback(
    (list: User[]) => {
      return list.filter((u) => {
        if (tab === 'banned' && u.status !== 'banned') return false;
        if (advanced.status && (u.status ?? 'active') !== advanced.status) return false;
        if (advanced.joinedAfter) {
          const joined = new Date(u.createdAt).getTime();
          const cutoff = new Date(advanced.joinedAfter).getTime();
          if (Number.isFinite(cutoff) && joined < cutoff) return false;
        }
        return true;
      });
    },
    [tab, advanced.status, advanced.joinedAfter],
  );

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.getAll(buildApiFilters(page, 10));
      setUsers(applyClientFilters(res.data));
      setPagination(res.pagination);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, buildApiFilters, applyClientFilters]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    const toastId = toast.loading('Preparing user export…');
    try {
      const pageSize = 100;
      const all: User[] = [];
      let current = 1;
      let totalPages = 1;
      do {
        // eslint-disable-next-line no-await-in-loop -- paginated fetch, sequential by design
        const res = await usersApi.getAll(buildApiFilters(current, pageSize));
        all.push(...res.data);
        totalPages = res.pagination.totalPages || 1;
        current += 1;
      } while (current <= totalPages);

      const filtered = applyClientFilters(all);
      if (filtered.length === 0) {
        toast.error('No users match the current filters', { id: toastId });
        return;
      }

      const date = new Date().toISOString().slice(0, 10);
      downloadCsv(`users-${tab}-${date}.csv`, usersToCsv(filtered));
      toast.success(`Exported ${filtered.length} ${filtered.length === 1 ? 'user' : 'users'}`, { id: toastId });
    } catch {
      toast.error('Export failed', { id: toastId });
    } finally {
      setExporting(false);
    }
  }

  function updateFilter<K extends keyof AdvancedFilters>(key: K, value: AdvancedFilters[K]) {
    setAdvanced((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setAdvanced(EMPTY_FILTERS);
    setPage(1);
  }

  function openInvite() {
    setInvite({ name: '', email: '', password: '', role: 'admin' });
    setInviteOpen(true);
  }

  async function submitInvite() {
    const name = invite.name.trim();
    const email = invite.email.trim();
    const password = invite.password;
    if (!name || !email) {
      toast.error('Name and email are required');
      return;
    }
    if (password.length < 8) {
      toast.error('Temporary password must be at least 8 characters');
      return;
    }
    setInviteBusy(true);
    try {
      await usersApi.create({ name, email, password, role: invite.role });
      toast.success(`Admin added: ${email}`);
      setInviteOpen(false);
      fetch();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr.response?.data?.message ?? 'Failed to add admin');
    } finally {
      setInviteBusy(false);
    }
  }

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHead
        title="Users"
        sub={`${pagination?.totalItems ?? users.length} members.`}
        right={
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={<I.download />}
              onClick={handleExport}
              disabled={exporting || loading}
            >
              {exporting ? 'Exporting…' : 'Export'}
            </Button>
            {isSuperAdmin && (
              <Button variant="primary" size="sm" icon={<I.plus />} onClick={openInvite}>
                Add admin
              </Button>
            )}
          </>
        }
      />

      <div className="flex items-center gap-2 flex-wrap">
        <Tabs<Tab>
          tabs={[
            { value: 'all', label: 'All', count: pagination?.totalItems },
            { value: 'customers', label: 'Customers' },
            { value: 'staff', label: 'Staff' },
            { value: 'banned', label: 'Banned' },
          ]}
          value={tab}
          onChange={(v) => {
            setTab(v);
            setPage(1);
          }}
        />
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <Input
            inputSize="sm"
            icon={<I.search />}
            placeholder="Name, email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            full={false}
          />
          <select
            style={{ ...SELECT_STYLE, width: 'auto', height: 34, fontSize: 13 }}
            value={advanced.status}
            onChange={(e) => updateFilter('status', e.target.value as StatusFilter)}
            aria-label="Status"
          >
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>
          <Input
            inputSize="sm"
            type="date"
            value={advanced.joinedAfter}
            onChange={(e) => updateFilter('joinedAfter', e.target.value)}
            aria-label="Joined after"
            full={false}
          />
          {advancedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      <Card padding={0}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-muted)' }}>
                {['User', 'Role', 'Joined', 'Lifetime', 'Status', ''].map((h) => (
                  <th key={h} style={TH_STYLE}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)' }}>
                    Loading…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)' }}>
                    No users.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const status = u.status ?? 'active';
                  const roleLabel = ROLE_LABEL[u.role];
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} size={32} />
                          <div>
                            <div style={{ color: 'var(--ink)', fontWeight: 500 }}>{u.name}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                              {u.email} · U-{String(u.id).padStart(4, '0')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--ink-2)' }}>
                        {u.role !== 'user' ? (
                          <Badge tone="accent" dot size="sm">{roleLabel}</Badge>
                        ) : (
                          <span style={{ color: 'var(--ink-3)' }}>{roleLabel}</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--ink-3)' }}>
                        {new Date(u.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td
                        style={{
                          padding: '14px 16px',
                          fontVariantNumeric: 'tabular-nums',
                          color: 'var(--ink)',
                        }}
                      >
                        {formatCurrency(u.lifetimeSpend ?? 0)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <Badge tone={STATUS_TONE[status]} dot size="sm">
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <IconBtn
                          icon={<I.chev_r />}
                          variant="ghost"
                          size={28}
                          aria-label={`View ${u.name}`}
                          onClick={() => setDetailUser(u)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={inviteOpen}
        title="Add admin"
        description="Create an admin account with a temporary password. They can change it on first login."
        onClose={() => !inviteBusy && setInviteOpen(false)}
      >
        <div className="flex flex-col gap-4">
          <Field label="Full name" required>
            <Input
              value={invite.name}
              onChange={(e) => setInvite({ ...invite, name: e.target.value })}
              placeholder="Alex Rivera"
              autoFocus
            />
          </Field>
          <Field label="Email" required>
            <Input
              type="email"
              value={invite.email}
              onChange={(e) => setInvite({ ...invite, email: e.target.value })}
              placeholder="alex@nexus.shop"
            />
          </Field>
          <Field label="Temporary password" required hint="At least 8 characters. Share securely.">
            <Input
              type="text"
              value={invite.password}
              onChange={(e) => setInvite({ ...invite, password: e.target.value })}
              placeholder="min. 8 characters"
            />
          </Field>
          <Field label="Role">
            <select
              style={SELECT_STYLE}
              value={invite.role}
              onChange={(e) => setInvite({ ...invite, role: e.target.value as 'admin' | 'super_admin' })}
            >
              <option value="admin">Admin · Support</option>
              <option value="super_admin">Admin · Owner</option>
            </select>
          </Field>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="secondary" onClick={() => setInviteOpen(false)} disabled={inviteBusy}>Cancel</Button>
            <Button variant="primary" onClick={submitInvite} loading={inviteBusy}>Add admin</Button>
          </div>
        </div>
      </Modal>

      <UserDetailModal
        user={detailUser}
        currentUserId={currentUser?.id}
        isSuperAdmin={isSuperAdmin}
        onClose={() => setDetailUser(null)}
        onUpdated={(updated) => {
          setUsers((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
        }}
      />
    </div>
  );
}
