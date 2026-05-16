import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
  required?: boolean;
}

export default function Field({ label, hint, error, children, className, required }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-[12.5px] font-medium" style={{ color: 'var(--ink-2)' }}>
          {label}
          {required && <span style={{ color: 'var(--terracotta)', marginLeft: 4 }}>*</span>}
        </label>
      )}
      {children}
      {error && <div className="text-xs" style={{ color: 'var(--danger)' }}>{error}</div>}
      {hint && !error && <div className="text-xs" style={{ color: 'var(--ink-4)' }}>{hint}</div>}
    </div>
  );
}

export { Field };
