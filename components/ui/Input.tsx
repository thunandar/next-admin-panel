'use client';

import { forwardRef, InputHTMLAttributes, ReactElement, ReactNode, cloneElement } from 'react';
import { cn } from '@/lib/utils';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactElement;
  suffix?: ReactNode;
  full?: boolean;
  inputSize?: InputSize;
}

const HEIGHTS: Record<InputSize, { h: number; fs: number }> = {
  sm: { h: 32, fs: 13 },
  md: { h: 38, fs: 14 },
  lg: { h: 46, fs: 15 },
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      icon,
      suffix,
      full = true,
      inputSize = 'md',
      className,
      id,
      style,
      ...props
    },
    ref,
  ) => {
    const inputId = id || (label && label.toLowerCase().replace(/\s+/g, '-'));
    const s = HEIGHTS[inputSize];
    return (
      <div className={cn('flex flex-col gap-1', full ? 'w-full' : '')}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-[12.5px] font-medium"
            style={{ color: 'var(--ink-2)' }}
          >
            {label}
          </label>
        )}
        <label
          className={cn(
            'inline-flex items-center gap-2 rounded-[10px] border transition-colors focus-within:ring-2 focus-within:ring-[var(--terracotta)]',
            error ? 'border-[var(--danger)]' : 'border-[var(--line-2)] hover:border-[var(--line-strong)]',
            full ? 'w-full' : '',
            className,
          )}
          style={{
            height: s.h,
            paddingLeft: 12,
            paddingRight: 12,
            background: 'var(--bg-elev)',
            fontSize: s.fs,
            ...style,
          }}
        >
          {icon && (
            <span className="inline-flex" style={{ color: 'var(--ink-3)' }}>
              {cloneElement(icon as ReactElement<{ size?: number }>, { size: 16 })}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className="flex-1 min-w-0 bg-transparent border-0 outline-none placeholder:text-[var(--ink-4)]"
            style={{ color: 'var(--ink)', fontSize: s.fs }}
            {...props}
          />
          {suffix && (
            <span style={{ color: 'var(--ink-3)', fontSize: s.fs - 1 }}>{suffix}</span>
          )}
        </label>
        {error && (
          <p className="text-xs" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs" style={{ color: 'var(--ink-4)' }}>
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
export default Input;
export { Input };
