import { Sparkles, TrendingUp, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CoachMessage } from '@/types'

const toneStyles = {
  positive: { wrap: 'border-success/30 bg-success/5', icon: 'text-success', Icon: TrendingUp },
  warning: { wrap: 'border-warning/30 bg-warning/5', icon: 'text-warning', Icon: AlertTriangle },
  neutral: { wrap: 'border-border/80 bg-card', icon: 'text-muted-foreground', Icon: Sparkles },
} as const

export function CoachCard({ message, className }: { message: CoachMessage; className?: string }) {
  const tone = toneStyles[message.tone]
  const Icon = tone.Icon
  return (
    <div className={cn('rounded-3xl border p-4', tone.wrap, className)}>
      <div className="flex items-center gap-2">
        <Icon className={cn('size-4', tone.icon)} />
        <p className="text-sm font-semibold">{message.title}</p>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{message.body}</p>
    </div>
  )
}
