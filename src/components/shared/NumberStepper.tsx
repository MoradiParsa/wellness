import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  max?: number
  precision?: number
  suffix?: string
  className?: string
}

export function NumberStepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = Infinity,
  precision = 0,
  suffix,
  className,
}: Props) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  const round = (v: number) => Number(v.toFixed(precision))
  const set = (v: number) => onChange(round(clamp(v)))

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        type="button"
        onClick={() => set(value - step)}
        className="flex size-11 items-center justify-center rounded-xl bg-secondary tap-scale active:bg-accent disabled:opacity-40"
        disabled={value <= min}
        aria-label="Decrease"
      >
        <Minus className="size-4" />
      </button>
      <div className="flex h-12 min-w-[5rem] flex-1 items-center justify-center gap-1 rounded-xl border border-input bg-secondary/50 px-2">
        <input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => set(e.target.value === '' ? min : Number(e.target.value))}
          className="w-full bg-transparent text-center text-lg font-semibold tabular-nums focus:outline-none"
        />
        {suffix && <span className="shrink-0 text-sm text-muted-foreground">{suffix}</span>}
      </div>
      <button
        type="button"
        onClick={() => set(value + step)}
        className="flex size-11 items-center justify-center rounded-xl bg-secondary tap-scale active:bg-accent disabled:opacity-40"
        disabled={value >= max}
        aria-label="Increase"
      >
        <Plus className="size-4" />
      </button>
    </div>
  )
}
