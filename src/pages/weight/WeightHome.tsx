import { useNavigate } from 'react-router-dom'
import { Plus, Scale, History, Flag } from 'lucide-react'
import { useState } from 'react'
import { TabPage } from '@/components/layout/TabPage'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { LineTrend } from '@/components/charts/Charts'
import { CoachCard } from '@/components/shared/CoachCard'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { useWeight } from '@/hooks/useWeight'
import { useWorkouts } from '@/hooks/useWorkouts'
import { useSettings } from '@/hooks/useSettings'
import { computeWeightTrend, volumeWithinDays, calculateBodyComposition } from '@/coach/metrics'
import { bulkCutCoach } from '@/coach/phase'
import { formatWeight, formatSignedWeight, toDisplayWeight } from '@/lib/format'
import { formatMonthDay, formatPretty, daysAgo } from '@/lib/date'
import type { WeightEntry, Settings } from '@/types'

type Timeframe = '7' | '30' | '90' | 'all'

export function WeightHome() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { entries, chronological, latest } = useWeight()
  const { workouts } = useWorkouts()
  const [tf, setTf] = useState<Timeframe>('30')

  const unit = settings.units.weight
  const boneFrac = (settings.boneBodyPercent ?? 8.4) / 100
  const trend = computeWeightTrend(chronological, settings.goalWeight)
  const strengthTrendUp =
    workouts.length >= 2 && volumeWithinDays(workouts, 7) >= volumeWithinDays(workouts, 14) - volumeWithinDays(workouts, 7)
  const coach = bulkCutCoach(settings, chronological, { strengthTrendUp })

  const latestComp = latest ? calculateBodyComposition(latest, boneFrac) : null
  const weekAgo = findPrev(chronological, 7)
  const monthAgo = findPrev(chronological, 28)
  const weekComp = weekAgo ? calculateBodyComposition(weekAgo, boneFrac) : null
  const monthComp = monthAgo ? calculateBodyComposition(monthAgo, boneFrac) : null

  // Charts respect the active timeframe.
  const tfDays = tf === 'all' ? Infinity : Number(tf)
  const windowed = chronological.filter((e) => daysAgo(e.date) <= tfDays)
  const disp = (kg: number) => Number(toDisplayWeight(kg, unit).toFixed(1))
  const pts = windowed.map((e) => ({ e, c: calculateBodyComposition(e, boneFrac), label: formatMonthDay(e.date) }))
  const withFat = pts.filter((p) => p.e.bodyFat != null)
  const withMuscle = pts.filter((p) => p.e.muscle != null)
  const withWater = pts.filter((p) => p.e.water != null)

  const charts: { title: string; data: { label: string; value: number }[]; suffix: string; color?: string }[] = [
    { title: `Body weight (${unit})`, data: pts.map((p) => ({ label: p.label, value: disp(p.e.weight) })), suffix: unit },
    { title: 'Body fat %', data: withFat.map((p) => ({ label: p.label, value: Number((p.e.bodyFat ?? 0).toFixed(1)) })), suffix: '%', color: 'hsl(var(--warning))' },
    { title: `Fat mass (${unit})`, data: withFat.map((p) => ({ label: p.label, value: disp(p.c.fatMassKg) })), suffix: unit, color: 'hsl(var(--warning))' },
    { title: 'Muscle %', data: withMuscle.map((p) => ({ label: p.label, value: Number((p.e.muscle ?? 0).toFixed(1)) })), suffix: '%', color: 'hsl(var(--success))' },
    { title: `Muscle mass (${unit})`, data: withMuscle.map((p) => ({ label: p.label, value: disp(p.c.muscleMassKg) })), suffix: unit, color: 'hsl(var(--success))' },
    { title: 'Water %', data: withWater.map((p) => ({ label: p.label, value: Number((p.e.water ?? 0).toFixed(1)) })), suffix: '%', color: 'hsl(217 91% 60%)' },
    { title: `Water mass (${unit})`, data: withWater.map((p) => ({ label: p.label, value: disp(p.c.waterMassKg) })), suffix: unit, color: 'hsl(217 91% 60%)' },
    { title: `Bone mass (${unit})`, data: pts.map((p) => ({ label: p.label, value: disp(p.c.boneMassKg) })), suffix: unit, color: 'hsl(var(--muted-foreground))' },
    { title: `Lean mass (${unit})`, data: withFat.map((p) => ({ label: p.label, value: disp(p.c.leanMassKg) })), suffix: unit },
  ].filter((ch) => ch.data.length >= 2)

  const massDelta = (sel: (c: ReturnType<typeof calculateBodyComposition>) => number) =>
    latestComp && weekComp ? sel(latestComp) - sel(weekComp) : null
  const monthMassDelta = (sel: (c: ReturnType<typeof calculateBodyComposition>) => number) =>
    latestComp && monthComp ? sel(latestComp) - sel(monthComp) : null

  return (
    <TabPage
      title="Body Metrics"
      right={
        <Button size="iconSm" variant="secondary" onClick={() => navigate('/weight/history')}>
          <History />
        </Button>
      }
    >
      {entries.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No body data yet"
          description="Log your weight — ideally fasted in the morning — with body fat, muscle and water % to track how your body is changing."
          action={
            <Button size="lg" onClick={() => navigate('/weight/new')}>
              <Plus className="size-4" /> Log weight
            </Button>
          }
        />
      ) : (
        <>
          {/* Current weight + change */}
          <Card className="mb-4">
            <CardContent className="flex items-end justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">Current weight</p>
                <p className="text-4xl font-bold tabular-nums">{formatWeight(latest!.weight, settings)}</p>
                <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  {weekAgo && <span>{formatSignedWeight(latest!.weight - weekAgo.weight, settings)} this week</span>}
                  {monthAgo && <span>{formatSignedWeight(latest!.weight - monthAgo.weight, settings)} this month</span>}
                  {!weekAgo && !monthAgo && <span>as of {formatPretty(latest!.date)}</span>}
                </p>
              </div>
              <Button onClick={() => navigate('/weight/new')}>
                <Plus className="size-4" /> Log
              </Button>
            </CardContent>
          </Card>

          {/* Composition summary cards */}
          {latestComp && (latest!.bodyFat != null || latest!.muscle != null || latest!.water != null) ? (
            <div className="mb-2 grid grid-cols-2 gap-3">
              {latest!.bodyFat != null && (
                <CompCard label="Body fat" percent={latestComp.fatPercent} massKg={latestComp.fatMassKg} weekDeltaKg={massDelta((c) => c.fatMassKg)} monthDeltaKg={monthMassDelta((c) => c.fatMassKg)} settings={settings} invertDelta />
              )}
              {latest!.muscle != null && (
                <CompCard label="Muscle" percent={latestComp.musclePercent} massKg={latestComp.muscleMassKg} weekDeltaKg={massDelta((c) => c.muscleMassKg)} monthDeltaKg={monthMassDelta((c) => c.muscleMassKg)} settings={settings} />
              )}
              {latest!.water != null && (
                <CompCard label="Water" percent={latestComp.waterPercent} massKg={latestComp.waterMassKg} weekDeltaKg={massDelta((c) => c.waterMassKg)} monthDeltaKg={monthMassDelta((c) => c.waterMassKg)} settings={settings} />
              )}
              <CompCard label="Bone" percent={latestComp.bonePercent} massKg={latestComp.boneMassKg} note="Stable estimate" settings={settings} />
              {latest!.bodyFat != null && (
                <CompCard label="Lean mass" massKg={latestComp.leanMassKg} weekDeltaKg={massDelta((c) => c.leanMassKg)} monthDeltaKg={monthMassDelta((c) => c.leanMassKg)} settings={settings} />
              )}
            </div>
          ) : (
            <p className="mb-3 px-1 text-xs text-muted-foreground">
              Add body fat, muscle and water % when you log a weigh-in to unlock your composition breakdown.
            </p>
          )}

          <p className="mb-4 px-1 text-[11px] leading-relaxed text-muted-foreground">
            Smart scale percentages are estimates and may overlap. Use trends more than single-day values.
          </p>

          {/* Goal */}
          <Card className="mb-4">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-secondary">
                  <Flag className="size-5" />
                </span>
                <div>
                  <p className="text-sm text-muted-foreground">Goal {formatWeight(settings.goalWeight, settings)}</p>
                  <p className="font-semibold">
                    {trend.projectedGoalDate ? `Projected ${formatPretty(trend.projectedGoalDate)}` : 'Keep logging to project'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          {charts.length > 0 && (
            <>
              <div className="mb-3">
                <SegmentedControl
                  layoutId="bodymetrics-tf"
                  size="sm"
                  value={tf}
                  onChange={(v: Timeframe) => setTf(v)}
                  options={[
                    { value: '7', label: '7d' },
                    { value: '30', label: '30d' },
                    { value: '90', label: '90d' },
                    { value: 'all', label: 'All' },
                  ]}
                />
              </div>
              <div className="space-y-4">
                {charts.map((ch) => (
                  <Card key={ch.title}>
                    <CardContent className="p-4">
                      <p className="mb-2 text-sm font-medium text-muted-foreground">{ch.title}</p>
                      <LineTrend data={ch.data} suffix={ch.suffix} color={ch.color} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          <div className="mt-4">
            <CoachCard message={coach} />
          </div>
        </>
      )}
    </TabPage>
  )
}

/** Most recent entry that is at least `n` days old (for week/month deltas). */
function findPrev(chronological: WeightEntry[], n: number): WeightEntry | null {
  for (let i = chronological.length - 1; i >= 0; i--) {
    if (daysAgo(chronological[i].date) >= n) return chronological[i]
  }
  return null
}

function CompCard({
  label,
  percent,
  massKg,
  weekDeltaKg,
  monthDeltaKg,
  note,
  settings,
  invertDelta,
}: {
  label: string
  percent?: number
  massKg: number
  weekDeltaKg?: number | null
  monthDeltaKg?: number | null
  note?: string
  settings: Settings
  /** for fat, a drop is good (green) and a gain is a warning */
  invertDelta?: boolean
}) {
  const good = weekDeltaKg == null ? false : invertDelta ? weekDeltaKg < 0 : weekDeltaKg > 0
  const bad = weekDeltaKg == null ? false : invertDelta ? weekDeltaKg > 0 : weekDeltaKg < 0
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      {percent != null && <p className="text-lg font-bold leading-tight tabular-nums">{Number(percent.toFixed(1))}%</p>}
      <p className={percent != null ? 'text-sm font-semibold tabular-nums text-muted-foreground' : 'text-lg font-bold tabular-nums'}>
        {formatWeight(massKg, settings)}
      </p>
      {note ? (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{note}</p>
      ) : (
        <>
          {weekDeltaKg != null && (
            <p className={`mt-0.5 text-[11px] ${good ? 'text-success' : bad ? 'text-warning' : 'text-muted-foreground'}`}>
              {formatSignedWeight(weekDeltaKg, settings)} this week
            </p>
          )}
          {monthDeltaKg != null && (
            <p className="text-[11px] text-muted-foreground">{formatSignedWeight(monthDeltaKg, settings)} this month</p>
          )}
        </>
      )}
    </div>
  )
}
