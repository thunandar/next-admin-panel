'use client';

import { CSSProperties, ReactNode, MouseEvent } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps {
  children: ReactNode;
  padding?: number | string;
  hover?: boolean;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  className?: string;
  style?: CSSProperties;
}

export default function Card({ children, padding = 24, hover, onClick, className, style }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl border bg-[var(--bg-elev)] border-[var(--line)] transition-all duration-150',
        onClick ? 'cursor-pointer' : '',
        hover ? 'hover:border-[var(--line-strong)] hover:shadow-[var(--shadow-2)]' : '',
        className,
      )}
      style={{ padding, ...style }}
    >
      {children}
    </div>
  );
}

export { Card };
