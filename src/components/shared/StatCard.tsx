import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  label: string
  value: ReactNode
  sub?: ReactNode
  className?: string
  onClick?: () => void
}

export function StatCard({ label, value, sub, className, onClick }: Props) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'flex flex-col gap-0.5 rounded-3xl border border-border/80 bg-card p-4 text-left',
        onClick && 'tap-scale',
        className,
      )}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-2xl font-bold tabular-nums leading-tight">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </Comp>
  )
}
