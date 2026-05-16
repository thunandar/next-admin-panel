import type { ReactNode } from 'react';
import { I } from './Icons';

export interface StatProps {
  label: ReactNode;
  value: ReactNode;
  delta?: string;
  suffix?: ReactNode;
  sparkline?: ReactNode;
}

export default function Stat({ label, value, delta, suffix, sparkline }: StatProps) {
  const positive = delta?.startsWith('+');
  const tone = positive ? 'var(--success)' : 'var(--danger)';
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border"
      style={{
        padding: 20,
        background: 'var(--bg-elev)',
        borderColor: 'var(--line)',
        minHeight: 120,
      }}
    >
      <div className="t-micro" style={{ color: 'var(--ink-3)' }}>{label}</div>
      <div className="flex items-baseline gap-2">
        <div style={{ fontFamily: 'var(--serif)', fontSize: 36, lineHeight: 1, color: 'var(--ink)' }}>
          {value}
        </div>
        {suffix && <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>{suffix}</div>}
      </div>
      <div className="flex items-center justify-between mt-auto">
        {delta && (
          <div
            className="inline-flex items-center gap-1"
            style={{ color: tone, fontSize: 12, fontWeight: 500 }}
          >
            {positive ? <I.trend_u size={13} /> : <I.trend_d size={13} />}
            {delta}
          </div>
        )}
        {sparkline && <div className="flex-1 ml-3">{sparkline}</div>}
      </div>
    </div>
  );
}

export { Stat };
