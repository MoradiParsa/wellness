import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  subtitle?: string
  right?: ReactNode
  children: ReactNode
  className?: string
}

export function TabPage({ title, subtitle, right, children, className }: Props) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="min-h-dvh pb-28"
    >
      <header className="safe-top flex items-end justify-between gap-3 px-5 pb-1 pt-4">
        <div className="min-w-0">
          {subtitle && (
            <p className="truncate text-sm font-medium text-muted-foreground">{subtitle}</p>
          )}
          <h1 className="text-[32px] font-bold leading-none tracking-tight">{title}</h1>
        </div>
        {right && <div className="shrink-0 pb-1">{right}</div>}
      </header>
      <div className={cn('px-5 pt-4', className)}>{children}</div>
    </motion.main>
  )
}
