import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SectionHeadProps {
  eyebrow?: ReactNode;
  title?: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export default function SectionHead({ eyebrow, title, sub, right, className, style }: SectionHeadProps) {
  return (
    <div
      className={cn('flex items-end justify-between gap-6 flex-wrap', className)}
      style={style}
    >
      <div className="min-w-0">
        {eyebrow && <div className="t-micro mb-2" style={{ color: 'var(--ink-3)' }}>{eyebrow}</div>}
        {title && <h1 className="t-h2 m-0" style={{ color: 'var(--ink)' }}>{title}</h1>}
        {sub && <div className="t-body mt-1.5" style={{ maxWidth: 600 }}>{sub}</div>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

export { SectionHead };
