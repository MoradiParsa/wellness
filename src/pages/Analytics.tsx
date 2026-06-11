import { useMemo } from 'react'
import { subWeeks } from 'date-fns'
import { BarChart3, Flame, Trophy } from 'lucide-react'
import { TabPage } from '@/components/layout/TabPage'
import { Card, CardContent } from '@/components/ui/card'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { LineTrend, BarSeries } from '@/components/charts/Charts'
import { useWorkouts } from '@/hooks/useWorkouts'
import { useWeight } from '@/hooks/useWeight'
import { useNutrition } from '@/hooks/useNutrition'
import { useTasks } from '@/hooks/useTasks'
import { useSettings } from '@/hooks/useSettings'
import { exerciseName } from '@/hooks/useExercises'
import {
  entryVolume,
  exercisePRs,
  currentStreak,
  countWithinDays,
} from '@/coach/metrics'
import { weekStartKey, parseKey, formatMonthDay, daysAgo } from '@/lib/date'
import { toDisplayWeight, formatWeight } from '@/lib/format'

export function Analytics() {
  const { workouts } = useWorkouts()
  const { chronological } = useWeight()
  const { allMeals } = useNutrition()
  const { tasks } = useTasks()
  const { settings } = useSettings()

  const hasData = workouts.length || chronological.length || allMeals.length || tasks.length

  // Weekly workout count + volume (last 6 weeks)
  const weeks = useMemo(() => {
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const key = weekStartKey(subWeeks(new Date(), 5 - i))
      return { key, label: formatMonthDay(key), count: 0, volume: 0 }
    })
    const idxByKey = new Map(buckets.map((b, i) => [b.key, i]))
    for (const w of workouts) {
      const k = weekStartKey(parseKey(w.date))
      const i = idxByKey.get(k)
      if (i == null) continue
      buckets[i].count += 1
      buckets[i].volume += w.entries.reduce((v, e) => v + entryVolume(e), 0)
    }
    return buckets
  }, [workouts])

  // Nutrition: days logged, avg calories/protein over last 30 days
  const nutrition = useMemo(() => {
    const byDate = new Map<string, { cal: number; pro: number }>()
    for (const m of allMeals) {
      if (daysAgo(m.date) >= 30) continue
      const cur = byDate.get(m.date) ?? { cal: 0, pro: 0 }
      cur.cal += m.calories
      cur.pro += m.protein
      byDate.set(m.date, cur)
    }
    const days = [...byDate.values()]
    const avgCal = days.length ? days.reduce((s, d) => s + d.cal, 0) / days.length : 0
    const avgPro = days.length ? days.reduce((s, d) => s + d.pro, 0) / days.length : 0
    return { daysLogged: days.length, avgCal, avgPro }
  }, [allMeals])

  const weightChart = chronological.map((e) => ({
    label: formatMonthDay(e.date),
    value: Number(toDisplayWeight(e.weight, settings.units.weight).toFixed(1)),
  }))

  const workoutStreak = currentStreak(workouts.map((w) => w.date))
  const nutritionStreak = currentStreak(allMeals.map((m) => m.date))

  const taskStats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((t) => t.completed).length
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 }
  }, [tasks])

  const prs = useMemo(() => {
    const ids = new Set<string>()
    workouts.forEach((w) => w.entries.forEach((e) => ids.add(e.exerciseId)))
    return [...ids]
      .map((id) => ({ id, ...exercisePRs(workouts, id) }))
      .filter((p) => p.maxE1RM > 0)
      .sort((a, b) => b.maxE1RM - a.maxE1RM)
      .slice(0, 6)
  }, [workouts])

  if (!hasData) {
    return (
      <TabPage title="Analytics">
        <EmptyState
          icon={BarChart3}
          title="No data yet"
          description="Log workouts, meals, weigh-ins, and tasks to unlock your trends and records."
        />
      </TabPage>
    )
  }

  return (
    <TabPage title="Analytics">
      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatCard label="Workouts / 30d" value={countWithinDays(workouts.map((w) => w.date), 30)} />
        <StatCard label="Avg calories" value={nutrition.avgCal ? Math.round(nutrition.avgCal) : '—'} sub={`${nutrition.daysLogged} days logged`} />
        <StatCard label="Avg protein" value={nutrition.avgPro ? `${Math.round(nutrition.avgPro)}g` : '—'} />
        <StatCard label="Task completion" value={taskStats.total ? `${taskStats.pct}%` : '—'} sub={`${taskStats.done}/${taskStats.total} done`} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Flame className={workoutStreak ? 'size-7 text-warning' : 'size-7 text-muted-foreground/40'} />
            <div>
              <p className="text-2xl font-bold leading-none">{workoutStreak}</p>
              <p className="text-xs text-muted-foreground">workout streak</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Flame className={nutritionStreak ? 'size-7 text-success' : 'size-7 text-muted-foreground/40'} />
            <div>
              <p className="text-2xl font-bold leading-none">{nutritionStreak}</p>
              <p className="text-xs text-muted-foreground">logging streak</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {weightChart.length >= 2 && (
        <Section title={`Weight trend (${settings.units.weight})`}>
          <LineTrend data={weightChart} suffix={settings.units.weight} />
        </Section>
      )}

      <Section title="Workouts per week">
        <BarSeries data={weeks.map((w) => ({ label: w.label, value: w.count }))} height={170} />
      </Section>

      {weeks.some((w) => w.volume > 0) && (
        <Section title={`Weekly volume (${settings.units.weight})`}>
          <BarSeries
            data={weeks.map((w) => ({
              label: w.label,
              value: Math.round(toDisplayWeight(w.volume, settings.units.weight)),
            }))}
            height={170}
            suffix={settings.units.weight}
            color="hsl(var(--muted-foreground))"
          />
        </Section>
      )}

      {prs.length > 0 && (
        <>
          <p className="mb-2 mt-6 flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Trophy className="size-3.5" /> Personal records
          </p>
          <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card">
            {prs.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{exerciseName(p.id)}</span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold tabular-nums">e1RM {formatWeight(p.maxE1RM, settings, 0)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {formatWeight(p.maxWeight, settings, 0)} × {p.maxWeightReps}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </TabPage>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <p className="mb-2 text-sm font-medium text-muted-foreground">{title}</p>
        {children}
      </CardContent>
    </Card>
  )
}
