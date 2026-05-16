'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { auditLogsApi } from '@/lib/api';
import Card from '@/components/ui/Card';
import SectionHead from '@/components/ui/SectionHead';
import Button, { IconBtn } from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { I } from '@/components/ui/Icons';
import type { AuditLog } from '@/types';

type Range = '24h' | '7d' | '30d';
type Severity = 'Info' | 'Success' | 'Warning' | 'Danger';

function toneOf(action: string): 'success' | 'warn' | 'danger' | 'info' | 'neutral' {
  if (/fail|error|delete|banned/i.test(action)) return 'danger';
  if (/create|success|fulfill|added|deliver/i.test(action)) return 'success';
  if (/low|warn|refund/i.test(action)) return 'warn';
  if (/update|edit|invit|login/i.test(action)) return 'info';
  return 'neutral';
}

function severityFromTone(tone: ReturnType<typeof toneOf>): Severity {
  if (tone === 'success') return 'Success';
  if (tone === 'warn') return 'Warning';
  if (tone === 'danger') return 'Danger';
  return 'Info';
}

function IconForTone({ tone }: { tone: ReturnType<typeof toneOf> }) {
  if (tone === 'success') return <I.check size={14} />;
  if (tone === 'warn') return <I.bell size={14} />;
  if (tone === 'danger') return <I.shield size={14} />;
  if (tone === 'info') return <I.edit size={14} />;
  return <I.log size={14} />;
}

function csvEscape(v: unknown): string {
  if (v == null) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCsv(rows: AuditLog[]) {
  if (rows.length === 0) {
    toast('Nothing to export — current filter is empty', { icon: 'ℹ️' });
    return;
  }
  const headers = ['Timestamp', 'Actor', 'Email', 'Action', 'Entity', 'Entity ID', 'Severity', 'IP', 'Details'];
  const lines = [headers.join(',')];
  for (const l of rows) {
    lines.push(
      [
        new Date(l.createdAt).toISOString(),
        l.user?.name ?? 'system',
        l.user?.email ?? '',
        l.action,
        l.entity,
        l.entityId ?? '',
        severityFromTone(toneOf(l.action)),
        l.ipAddress ?? '',
        l.details,
      ]
        .map(csvEscape)
        .join(','),
    );
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success(`Exported ${rows.length} ${rows.length === 1 ? 'event' : 'events'}`);
}

const ROW_LABEL: React.CSSProperties = {
  fontSize: 10.5,
  letterSpacing: 0.08,
  textTransform: 'uppercase',
  color: 'var(--ink-3)',
  fontWeight: 500,
  marginBottom: 4,
};

const ROW_VALUE: React.CSSProperties = {
  fontSize: 13.5,
  color: 'var(--ink)',
  lineHeight: 1.45,
  wordBreak: 'break-word',
};

function EventDetailModal({ log, onClose }: { log: AuditLog | null; onClose: () => void }) {
  if (!log) return null;
  const tone = toneOf(log.action);
  const severity = severityFromTone(tone);
  const dt = new Date(log.createdAt);
  const toneFg = {
    success: 'var(--success)',
    warn: 'var(--warn)',
    danger: 'var(--danger)',
    info: 'var(--info)',
    neutral: 'var(--ink-3)',
  }[tone];
  const toneBg = {
    success: 'var(--success-tint)',
    warn: 'var(--warn-tint)',
    danger: 'var(--danger-tint)',
    info: 'var(--info-tint)',
    neutral: 'var(--bg-muted)',
  }[tone];
  const detailsText = log.details
    ? typeof log.details === 'object'
      ? JSON.stringify(log.details, null, 2)
      : String(log.details)
    : null;

  return (
    <Modal open title={`Event #${log.id}`} description={`${log.action} · ${log.entity}`} onClose={onClose} size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center"
            style={{ width: 32, height: 32, borderRadius: 8, background: toneBg, color: toneFg }}
          >
            <IconForTone tone={tone} />
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: '3px 9px',
              borderRadius: 999,
              background: toneBg,
              color: toneFg,
              letterSpacing: 0.04,
            }}
          >
            {severity}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }} className="t-num">
            {dt.toLocaleString()}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={ROW_LABEL}>Actor</div>
            <div style={ROW_VALUE}>{log.user?.name ?? 'system'}</div>
            {log.user?.email && (
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{log.user.email}</div>
            )}
          </div>
          <div>
            <div style={ROW_LABEL}>Entity</div>
            <div style={ROW_VALUE}>
              {log.entity}
              {log.entityId != null ? ` #${log.entityId}` : ''}
            </div>
          </div>
          <div>
            <div style={ROW_LABEL}>Action</div>
            <div style={ROW_VALUE}>{log.action}</div>
          </div>
          <div>
            <div style={ROW_LABEL}>IP address</div>
            <div style={ROW_VALUE} className="t-num">
              {log.ipAddress ?? '—'}
            </div>
          </div>
        </div>

        <div>
          <div style={ROW_LABEL}>Details</div>
          {detailsText ? (
            <pre
              style={{
                margin: 0,
                padding: 12,
                background: 'var(--bg-muted)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                fontSize: 12.5,
                lineHeight: 1.5,
                color: 'var(--ink-2)',
                fontFamily: 'var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 280,
                overflow: 'auto',
              }}
            >
              {detailsText}
            </pre>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>No additional details recorded.</div>
          )}
        </div>

        <div className="flex justify-end gap-2" style={{ marginTop: 4 }}>
          {detailsText && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                navigator.clipboard
                  .writeText(detailsText)
                  .then(() => toast.success('Details copied'))
                  .catch(() => toast.error('Copy failed'));
              }}
            >
              Copy details
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [range, setRange] = useState<Range>('7d');
  const [search, setSearch] = useState('');
  const [actorFilters, setActorFilters] = useState<string[]>([]);
  const [severityFilters, setSeverityFilters] = useState<string[]>([
    'Info',
    'Success',
    'Warning',
    'Danger',
  ]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets loading indicator on range refetch
    setLoading(true);
    auditLogsApi
      .getAll({ page: 1, limit: 50 })
      .then((res) => {
        if (!cancelled) setLogs(res.logs);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load audit log');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const actorNames = Array.from(new Set(logs.map((l) => l.user?.name ?? 'system')));

  const toggleActor = (n: string) =>
    setActorFilters((a) => (a.includes(n) ? a.filter((x) => x !== n) : [...a, n]));

  const toggleSeverity = (n: string) =>
    setSeverityFilters((a) => (a.includes(n) ? a.filter((x) => x !== n) : [...a, n]));

  const filtered = logs.filter((l) => {
    if (actorFilters.length > 0) {
      const actor = l.user?.name ?? 'system';
      if (!actorFilters.includes(actor)) return false;
    }
    if (severityFilters.length > 0) {
      const sev = severityFromTone(toneOf(l.action));
      if (!severityFilters.includes(sev)) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (
        !l.action.toLowerCase().includes(q) &&
        !l.entity.toLowerCase().includes(q) &&
        !(l.user?.name ?? '').toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHead
        title="Audit log"
        sub="Every change made in your store, by whom, and when."
        right={
          <>
            <Tabs<Range>
              tabs={[
                { value: '24h', label: '24h' },
                { value: '7d', label: '7d' },
                { value: '30d', label: '30d' },
              ]}
              value={range}
              onChange={setRange}
            />
            <Button
              variant="secondary"
              size="sm"
              icon={<I.download />}
              onClick={() => exportCsv(filtered)}
            >
              Export
            </Button>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 20 }}>
        <Card padding={20}>
          <div className="t-h4" style={{ marginBottom: 12 }}>Filter</div>
          <div className="t-micro" style={{ marginBottom: 8 }}>Actor</div>
          <div className="flex flex-col gap-1.5 mb-4">
            {['All', ...actorNames].map((a) => (
              <label
                key={a}
                className="flex items-center gap-2"
                style={{ fontSize: 13, color: 'var(--ink-2)' }}
              >
                <input
                  type="checkbox"
                  checked={a === 'All' ? actorFilters.length === 0 : actorFilters.includes(a)}
                  onChange={() => {
                    if (a === 'All') setActorFilters([]);
                    else toggleActor(a);
                  }}
                  style={{ accentColor: 'var(--ink)' }}
                />
                {a}
              </label>
            ))}
          </div>
          <div className="t-micro" style={{ marginBottom: 8 }}>Severity</div>
          <div className="flex flex-col gap-1.5">
            {['Info', 'Success', 'Warning', 'Danger'].map((s) => (
              <label
                key={s}
                className="flex items-center gap-2"
                style={{ fontSize: 13, color: 'var(--ink-2)' }}
              >
                <input
                  type="checkbox"
                  checked={severityFilters.includes(s)}
                  onChange={() => toggleSeverity(s)}
                  style={{ accentColor: 'var(--ink)' }}
                />
                {s}
              </label>
            ))}
          </div>
        </Card>

        <Card padding={0}>
          <div
            className="flex items-center justify-between"
            style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)' }}
          >
            <Input
              inputSize="sm"
              icon={<I.search />}
              placeholder="Search log..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              full={false}
              style={{ width: 280 }}
            />
            <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
              {filtered.length} events
            </span>
          </div>
          {loading ? (
            <div style={{ padding: 24, color: 'var(--ink-4)' }}>Loading…</div>
          ) : (
            filtered.map((l, i) => {
              const tone = toneOf(l.action);
              const toneBg = {
                success: 'var(--success-tint)',
                warn: 'var(--warn-tint)',
                danger: 'var(--danger-tint)',
                info: 'var(--info-tint)',
                neutral: 'var(--bg-muted)',
              }[tone];
              const toneFg = {
                success: 'var(--success)',
                warn: 'var(--warn)',
                danger: 'var(--danger)',
                info: 'var(--info)',
                neutral: 'var(--ink-3)',
              }[tone];
              const dt = new Date(l.createdAt);
              return (
                <div
                  key={l.id}
                  className="flex items-center gap-3.5"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(l)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected(l);
                    }
                  }}
                  style={{
                    padding: '14px 20px',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--line)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ width: 56, fontSize: 11.5, color: 'var(--ink-3)' }}>
                    <div className="t-num">
                      {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ marginTop: 1, color: 'var(--ink-4)' }}>
                      {dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      flexShrink: 0,
                      background: toneBg,
                      color: toneFg,
                    }}
                  >
                    <IconForTone tone={tone} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4 }}>
                      <span style={{ color: 'var(--ink)', fontWeight: 500 }}>
                        {l.user?.name ?? 'system'}
                      </span>{' '}
                      {l.action}{' '}
                      <span style={{ color: 'var(--ink)' }}>
                        {l.entity}
                        {l.entityId ? ` #${l.entityId}` : ''}
                      </span>
                    </div>
                    {l.details && (
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                        {typeof l.details === 'object'
                          ? JSON.stringify(l.details)
                          : String(l.details)}
                      </div>
                    )}
                  </div>
                  <IconBtn
                    icon={<I.chev_r />}
                    variant="ghost"
                    size={28}
                    aria-label="View event details"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(l);
                    }}
                  />
                </div>
              );
            })
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 24, color: 'var(--ink-4)', textAlign: 'center' }}>
              No events in this window.
            </div>
          )}
        </Card>
      </div>

      <EventDetailModal log={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
