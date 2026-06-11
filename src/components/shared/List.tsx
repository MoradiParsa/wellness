import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ListGroup({
  title,
  children,
  className,
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-6', className)}>
      {title && (
        <p className="mb-2 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
      )}
      <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card">
        {children}
      </div>
    </div>
  )
}

interface RowProps {
  icon?: LucideIcon
  iconClassName?: string
  label: ReactNode
  sublabel?: ReactNode
  value?: ReactNode
  right?: ReactNode
  chevron?: boolean
  onClick?: () => void
  className?: string
}

export function ListRow({
  icon: Icon,
  iconClassName,
  label,
  sublabel,
  value,
  right,
  chevron,
  onClick,
  className,
}: RowProps) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3.5 text-left',
        onClick && 'active:bg-secondary/60',
        className,
      )}
    >
      {Icon && (
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground',
            iconClassName,
          )}
        >
          <Icon className="size-[18px]" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{label}</span>
        {sublabel && <span className="block truncate text-xs text-muted-foreground">{sublabel}</span>}
      </span>
      {value != null && <span className="shrink-0 text-[15px] text-muted-foreground">{value}</span>}
      {right}
      {chevron && <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" />}
    </Comp>
  )
}
