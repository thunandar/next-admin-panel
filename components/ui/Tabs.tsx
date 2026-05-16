'use client';

import { cloneElement, ReactElement, CSSProperties } from 'react';

export interface TabItem<T extends string = string> {
  value: T;
  label: string;
  count?: number;
  icon?: ReactElement;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  value: T;
  onChange: (v: T) => void;
  style?: CSSProperties;
  className?: string;
}

export default function Tabs<T extends string = string>({
  tabs,
  value,
  onChange,
  style,
  className,
}: TabsProps<T>) {
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        padding: 3,
        gap: 2,
        background: 'var(--bg-muted)',
        borderRadius: 999,
        ...style,
      }}
    >
      {tabs.map((t) => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            style={{
              height: 30,
              padding: '0 14px',
              border: 'none',
              borderRadius: 999,
              background: active ? 'var(--bg-elev)' : 'transparent',
              color: active ? 'var(--ink)' : 'var(--ink-3)',
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: -0.1,
              boxShadow: active ? 'var(--shadow-1)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              transition: 'all .15s ease',
            }}
          >
            {t.icon && cloneElement(t.icon as ReactElement<{ size?: number }>, { size: 14 })}
            {t.label}
            {t.count !== undefined && (
              <span
                style={{
                  fontSize: 11,
                  padding: '1px 6px',
                  borderRadius: 999,
                  background: active ? 'var(--bg-muted)' : 'transparent',
                  color: 'var(--ink-3)',
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export { Tabs };
