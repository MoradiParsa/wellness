import { Sparkles, TrendingUp, TrendingDown, Minus, Dumbbell } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DailyBrief } from '@/coach/dailyCoach'

export function DailyCoachCard({ brief }: { brief: DailyBrief }) {
  const RateIcon =
    brief.weeklyRateValue == null || Math.abs(brief.weeklyRateValue) < 0.02
      ? Minus
      : brief.weeklyRateValue > 0
        ? TrendingUp
        : TrendingDown

  return (
    <div className="overflow-hidden rounded-3xl border border-border/80 bg-card">
      <div className="border-b border-border/60 bg-secondary/30 px-5 py-4">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Sparkles className="size-3.5" /> Daily coach
        </p>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="text-4xl font-bold leading-none tabular-nums">{brief.calories.toLocaleString()}</p>
            <p className="mt-1 text-xs text-muted-foreground">calories today</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-right">
            <Macro label="Protein" value={brief.macros.protein} />
            <Macro label="Carbs" value={brief.macros.carbs} />
            <Macro label="Fat" value={brief.macros.fat} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 px-5 py-3 text-sm">
        <span className="flex items-center gap-1.5">
          <RateIcon className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground">{brief.weeklyRateText ?? 'No trend yet'}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Dumbbell className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground">{brief.workoutLabel}</span>
        </span>
      </div>

      <div className={cn('px-5 pb-4', toneText(brief.tone))}>
        <p className="text-sm font-semibold">{brief.coachTitle}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{brief.coachBody}</p>
      </div>
    </div>
  )
}

function toneText(tone: DailyBrief['tone']) {
  if (tone === 'positive') return '[&_.font-semibold]:text-success'
  if (tone === 'warning') return '[&_.font-semibold]:text-warning'
  return ''
}

function Macro({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-sm font-bold tabular-nums">{value}g</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}
