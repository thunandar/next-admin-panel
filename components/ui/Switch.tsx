'use client';

import type { ReactNode } from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange?: (v: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
}

export default function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <label
      className="inline-flex items-center gap-2.5 select-none"
      style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange?.(!checked)}
        className="inline-flex transition-colors"
        style={{
          width: 32,
          height: 18,
          borderRadius: 999,
          padding: 2,
          background: checked ? 'var(--ink)' : 'var(--ink-5)',
          border: 'none',
          cursor: 'inherit',
        }}
      >
        <span
          aria-hidden
          className="transition-transform"
          style={{
            width: 14,
            height: 14,
            borderRadius: 999,
            background: '#fff',
            transform: checked ? 'translateX(14px)' : 'translateX(0)',
          }}
        />
      </button>
      {label && <span style={{ fontSize: 14 }}>{label}</span>}
    </label>
  );
}

export { Switch };
