import { cn } from '@/lib/utils'

type Variant = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple'

interface BadgeProps {
  variant?: Variant
  children: React.ReactNode
  className?: string
}

const styles: Record<Variant, string> = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
  gray: 'bg-gray-100 text-gray-700',
  purple: 'bg-purple-100 text-purple-800',
}

export default function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', styles[variant], className)}>
      {children}
    </span>
  )
}
