import { cn } from '@/lib/utils';
import type { ReactNode, CSSProperties } from 'react';

export type Tone = 'neutral' | 'success' | 'warn' | 'danger' | 'info' | 'accent' | 'sage';
// Back-compat variants (existing callers use these)
export type Variant = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple';

const TONES: Record<Tone, { bg: string; fg: string; dot: string }> = {
  neutral: { bg: 'var(--bg-muted)',        fg: 'var(--ink-2)',       dot: 'var(--ink-3)' },
  success: { bg: 'var(--success-tint)',    fg: 'var(--success)',     dot: 'var(--success)' },
  warn:    { bg: 'var(--warn-tint)',       fg: 'var(--warn)',        dot: 'var(--warn)' },
  danger:  { bg: 'var(--danger-tint)',     fg: 'var(--danger)',      dot: 'var(--danger)' },
  info:    { bg: 'var(--info-tint)',       fg: 'var(--info)',        dot: 'var(--info)' },
  accent:  { bg: 'var(--terracotta-tint)', fg: 'var(--terracotta-2)', dot: 'var(--terracotta)' },
  sage:    { bg: 'var(--sage-tint)',       fg: 'var(--sage-2)',      dot: 'var(--sage)' },
};

const VARIANT_TO_TONE: Record<Variant, Tone> = {
  green: 'success',
  yellow: 'warn',
  red: 'danger',
  blue: 'info',
  gray: 'neutral',
  purple: 'accent',
};

export interface BadgeProps {
  tone?: Tone;
  /** @deprecated use `tone` */
  variant?: Variant;
  dot?: boolean;
  size?: 'sm' | 'md';
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export default function Badge({
  tone,
  variant,
  dot = false,
  size = 'md',
  children,
  className,
  style,
}: BadgeProps) {
  const t = TONES[tone ?? (variant ? VARIANT_TO_TONE[variant] : 'neutral')];
  const h = size === 'sm' ? 20 : 24;
  const px = size === 'sm' ? 8 : 10;
  const fs = size === 'sm' ? 11 : 12;
  return (
    <span
      className={cn('inline-flex items-center rounded-full font-medium leading-none', className)}
      style={{
        height: h,
        paddingLeft: px,
        paddingRight: px,
        gap: 6,
        background: t.bg,
        color: t.fg,
        fontSize: fs,
        ...style,
      }}
    >
      {dot && (
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: t.dot,
            display: 'inline-block',
          }}
        />
      )}
      {children}
    </span>
  );
}

export { Badge };
