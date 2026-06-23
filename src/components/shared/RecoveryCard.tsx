import { HeartPulse } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RecoveryResult, Readiness } from '@/coach/recovery'

const TONE: Record<Readiness, string> = {
  High: 'text-success',
  Moderate: 'text-warning',
  Low: 'text-destructive',
}

export function RecoveryCard({
  recovery,
  showFactors = false,
}: {
  recovery: RecoveryResult
  showFactors?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border/80 bg-card">
      <div className="flex items-start gap-4 p-5">
        <div className="text-center">
          <p className={cn('text-5xl font-bold leading-none tabular-nums', recovery.available ? TONE[recovery.readiness] : 'text-muted-foreground')}>
            {recovery.available ? recovery.score : '—'}
          </p>
          <p className="mt-1 flex items-center justify-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <HeartPulse className="size-3" /> Recovery
          </p>
        </div>
        <div className="min-w-0 flex-1">
          {recovery.available ? (
            <>
              <p className="text-sm font-semibold">
                Training readiness: <span className={TONE[recovery.readiness]}>{recovery.readiness}</span>
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{recovery.recommendation}</p>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Log sleep, resting heart rate, or a workout to unlock your recovery score.
            </p>
          )}
        </div>
      </div>

      {showFactors && recovery.available && recovery.factors.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-border/60 px-5 py-3">
          {recovery.factors.map((f, i) => (
            <span
              key={i}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-medium',
                f.points > 0 ? 'border-success/40 text-success' : f.points < 0 ? 'border-destructive/40 text-destructive' : 'border-border text-muted-foreground',
              )}
            >
              {f.label} {f.points > 0 ? `+${f.points}` : f.points}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
