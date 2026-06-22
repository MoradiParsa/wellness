import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, HeartPulse, Scale, ClipboardPaste, RefreshCw, Activity } from 'lucide-react'
import { TabPage } from '@/components/layout/TabPage'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/sonner'
import { useHealth } from '@/hooks/useHealth'
import { todayKey, addDaysKey, isToday, formatPretty, formatMonthDay } from '@/lib/date'
import type { HealthEntry } from '@/types'

type FieldKey = Exclude<keyof HealthEntry, 'id' | 'date' | 'notes'>

const FIELDS: { key: FieldKey; label: string; suffix?: string; decimal?: boolean }[] = [
  { key: 'steps', label: 'Steps' },
  { key: 'activeCalories', label: 'Active cal', suffix: 'kcal' },
  { key: 'caloriesBurned', label: 'Total burned', suffix: 'kcal' },
  { key: 'sleepHours', label: 'Sleep', suffix: 'h', decimal: true },
  { key: 'restingHeartRate', label: 'Resting HR', suffix: 'bpm' },
  { key: 'avgHeartRate', label: 'Avg HR', suffix: 'bpm' },
  { key: 'workoutMinutes', label: 'Workout', suffix: 'min' },
]

/** Loose "label number" parser for pasted health summaries. */
function parsePasted(text: string): Partial<Record<FieldKey, number>> {
  const t = text.toLowerCase()
  const num = (re: RegExp): number | undefined => {
    const m = t.match(re)
    return m ? parseFloat(m[1].replace(/,/g, '')) : undefined
  }
  const out: Partial<Record<FieldKey, number>> = {}
  const assign = (k: FieldKey, v?: number) => {
    if (v != null && isFinite(v)) out[k] = v
  }
  assign('steps', num(/steps?\D*([\d,]+)/))
  assign('activeCalories', num(/active\D*([\d,]+)/))
  assign('caloriesBurned', num(/(?:total|burned|burn)\D*([\d,]+)/))
  assign('sleepHours', num(/sleep\D*([\d.]+)/))
  assign('restingHeartRate', num(/resting\D*([\d]+)/))
  assign('avgHeartRate', num(/(?:avg|average)[^\d]*([\d]+)/))
  assign('workoutMinutes', num(/workout\D*([\d]+)/))
  return out
}

export function HealthDay() {
  const navigate = useNavigate()
  const { entries, getByDate, save } = useHealth()
  const [date, setDate] = useState(todayKey())
  const [form, setForm] = useState<Record<string, string>>({})
  const [showPaste, setShowPaste] = useState(false)
  const [pasteText, setPasteText] = useState('')

  // Seed the form from the stored row whenever the date changes.
  useEffect(() => {
    const e = getByDate(date)
    const next: Record<string, string> = {}
    for (const f of FIELDS) {
      const v = e?.[f.key]
      next[f.key] = v != null ? String(v) : ''
    }
    setForm(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const setField = (key: FieldKey, raw: string) => {
    setForm((p) => ({ ...p, [key]: raw }))
    const n = raw.trim() === '' ? undefined : Number(raw)
    save(date, { [key]: n != null && isFinite(n) ? n : undefined })
  }

  const applyPaste = () => {
    const parsed = parsePasted(pasteText)
    const keys = Object.keys(parsed) as FieldKey[]
    if (keys.length === 0) {
      toast.error('Nothing recognized — try lines like "Steps 12,430" or "Sleep 6.5".')
      return
    }
    save(date, parsed)
    setForm((p) => {
      const next = { ...p }
      for (const k of keys) next[k] = String(parsed[k])
      return next
    })
    setPasteText('')
    setShowPaste(false)
    toast.success(`Imported ${keys.length} value${keys.length > 1 ? 's' : ''}`)
  }

  return (
    <TabPage title="Health" subtitle="Manual daily import">
      <div className="mb-4 flex items-center justify-between rounded-full bg-secondary/60 p-1">
        <button onClick={() => setDate(addDaysKey(date, -1))} className="flex size-9 items-center justify-center rounded-full active:bg-background">
          <ChevronLeft className="size-5" />
        </button>
        <span className="text-sm font-semibold">{isToday(date) ? 'Today' : formatPretty(date)}</span>
        <button
          onClick={() => !isToday(date) && setDate(addDaysKey(date, 1))}
          className="flex size-9 items-center justify-center rounded-full active:bg-background disabled:opacity-30"
          disabled={isToday(date)}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Activity className="size-4 text-muted-foreground" /> Daily metrics
            </span>
            <button onClick={() => setShowPaste((v) => !v)} className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <ClipboardPaste className="size-3.5" /> Paste
            </button>
          </div>

          {showPaste && (
            <div className="mb-3 space-y-2">
              <Textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={'Paste a summary, e.g.\nSteps 12,430\nActive 640 kcal\nSleep 6.5\nResting 58'}
                className="min-h-[88px] text-sm"
              />
              <Button size="sm" variant="secondary" className="w-full" onClick={applyPaste}>
                Fill from pasted text
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            {FIELDS.map((f) => (
              <label key={f.key} className="flex flex-col gap-1">
                <span className="px-0.5 text-[11px] font-medium text-muted-foreground">
                  {f.label}
                  {f.suffix ? ` (${f.suffix})` : ''}
                </span>
                <input
                  value={form[f.key] ?? ''}
                  onChange={(e) => setField(f.key, e.target.value)}
                  inputMode={f.decimal ? 'decimal' : 'numeric'}
                  placeholder="—"
                  className="h-11 rounded-xl border border-input bg-secondary/50 px-3 text-base tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <button
        onClick={() => navigate('/weight/new')}
        className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-border/80 bg-card p-4 text-left active:bg-secondary/50"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
          <Scale className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">Body weight & composition</span>
          <span className="block text-xs text-muted-foreground">Weight, body fat %, muscle %, water % — log in the Weight tab</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </button>

      <Card className="mb-4">
        <CardContent className="p-4">
          <p className="mb-1.5 flex items-center gap-2 text-sm font-medium">
            <HeartPulse className="size-4 text-muted-foreground" /> Apple Health & Garmin
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Data flow: <span className="text-foreground">Garmin → Apple Health → Progress OS</span>. As a web app this
            can’t read Apple Health automatically yet — that needs a future iOS HealthKit wrapper. For now, enter or
            paste your numbers above; the coach uses them for recovery and burn guidance.
          </p>
          <Button variant="secondary" className="mt-3 w-full" disabled>
            <RefreshCw className="size-4" /> Refresh from Apple Health
          </Button>
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">Requires future iOS HealthKit wrapper</p>
        </CardContent>
      </Card>

      {entries.length > 0 && (
        <>
          <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent days</p>
          <div className="space-y-2">
            {entries.slice(0, 7).map((e) => (
              <button
                key={e.id}
                onClick={() => setDate(e.date)}
                className="flex w-full items-center justify-between rounded-2xl border border-border/70 bg-card px-4 py-3 text-left active:bg-secondary/50"
              >
                <span className="text-sm font-medium">{formatMonthDay(e.date)}</span>
                <span className="truncate pl-3 text-xs text-muted-foreground">
                  {[
                    e.steps != null && `${e.steps.toLocaleString()} steps`,
                    e.sleepHours != null && `${e.sleepHours}h sleep`,
                    e.restingHeartRate != null && `${e.restingHeartRate} bpm`,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'No metrics'}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </TabPage>
  )
}
