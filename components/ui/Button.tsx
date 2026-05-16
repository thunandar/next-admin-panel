'use client';

import { forwardRef, ButtonHTMLAttributes, ReactElement, cloneElement, MouseEvent } from 'react';
import { cn } from '@/lib/utils';

export type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'subtle' | 'danger';
export type Size = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactElement;
  iconRight?: ReactElement;
  full?: boolean;
}

const SIZES: Record<Size, { h: number; px: number; fs: number; gap: number; ic: number }> = {
  xs: { h: 26, px: 10, fs: 12, gap: 6, ic: 13 },
  sm: { h: 32, px: 12, fs: 13, gap: 6, ic: 15 },
  md: { h: 38, px: 16, fs: 14, gap: 8, ic: 16 },
  lg: { h: 46, px: 20, fs: 15, gap: 10, ic: 18 },
};

const VARIANTS: Record<Variant, { bg: string; fg: string; bd: string }> = {
  primary:   { bg: 'var(--ink)',         fg: 'var(--bg)',       bd: 'var(--ink)' },
  accent:    { bg: 'var(--terracotta)',  fg: '#fff',            bd: 'var(--terracotta)' },
  secondary: { bg: 'var(--bg-elev)',     fg: 'var(--ink)',      bd: 'var(--line-2)' },
  ghost:     { bg: 'transparent',        fg: 'var(--ink)',      bd: 'transparent' },
  subtle:    { bg: 'var(--bg-muted)',    fg: 'var(--ink)',      bd: 'transparent' },
  danger:    { bg: 'var(--bg-elev)',     fg: 'var(--danger)',   bd: 'var(--line-2)' },
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading,
      disabled,
      icon,
      iconRight,
      full,
      className,
      children,
      style,
      onMouseEnter,
      onMouseLeave,
      ...props
    },
    ref,
  ) => {
    const s = SIZES[size];
    const v = VARIANTS[variant];
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center font-medium whitespace-nowrap rounded-full border',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--terracotta)]',
          'transition-[transform,background-color,color,border-color] duration-150',
          isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-px cursor-pointer',
          full ? 'w-full' : '',
          className,
        )}
        style={{
          height: s.h,
          paddingLeft: s.px,
          paddingRight: s.px,
          background: v.bg,
          color: v.fg,
          borderColor: v.bd,
          fontSize: s.fs,
          letterSpacing: -0.1,
          gap: s.gap,
          ...style,
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        {...props}
      >
        {loading ? (
          <span
            aria-hidden
            className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent"
            style={{ width: s.ic, height: s.ic }}
          />
        ) : icon ? (
          <span className="inline-flex">{cloneElement(icon as ReactElement<{ size?: number }>, { size: s.ic })}</span>
        ) : null}
        {children}
        {iconRight && !loading && (
          <span className="inline-flex">{cloneElement(iconRight as ReactElement<{ size?: number }>, { size: s.ic })}</span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
export default Button;

// Named export for flexibility
export { Button };

// ── IconBtn ──
type IconBtnVariant = 'ghost' | 'subtle' | 'bordered';
const ICONBTN: Record<IconBtnVariant, { bg: string; fg: string; bd: string }> = {
  ghost:    { bg: 'transparent',     fg: 'var(--ink-2)', bd: 'transparent' },
  subtle:   { bg: 'var(--bg-muted)', fg: 'var(--ink)',   bd: 'transparent' },
  bordered: { bg: 'var(--bg-elev)',  fg: 'var(--ink-2)', bd: 'var(--line-2)' },
};

export interface IconBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactElement;
  size?: number;
  variant?: IconBtnVariant;
}

export function IconBtn({ icon, size = 32, variant = 'ghost', style, onMouseEnter, onMouseLeave, ...rest }: IconBtnProps) {
  const v = ICONBTN[variant];
  return (
    <button
      {...rest}
      className={cn('inline-flex items-center justify-center rounded-full border transition-colors cursor-pointer', rest.className)}
      style={{
        width: size,
        height: size,
        background: v.bg,
        color: v.fg,
        borderColor: v.bd,
        ...style,
      }}
      onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-muted)';
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => {
        (e.currentTarget as HTMLButtonElement).style.background = v.bg;
        onMouseLeave?.(e);
      }}
    >
      {cloneElement(icon as ReactElement<{ size?: number }>, { size: Math.round(size * 0.5) })}
    </button>
  );
}
