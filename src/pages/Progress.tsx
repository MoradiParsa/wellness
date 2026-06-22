import { useMemo } from 'react'
import { subWeeks } from 'date-fns'
import { TrendingUp, Flame, CalendarCheck, Scale, Sparkles, LineChart } from 'lucide-react'
import { TabPage } from '@/components/layout/TabPage'
import { Card, CardContent } from '@/components/ui/card'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { LineTrend, BarSeries } from '@/components/charts/Charts'
import { useWeight } from '@/hooks/useWeight'
import { useNutrition } from '@/hooks/useNutrition'
import { useSettings } from '@/hooks/useSettings'
import { useCollection } from '@/data/store'
import { adjustmentsStore } from '@/data/collections'
import { computeWeightTrend } from '@/coach/metrics'
import { weekStartKey, parseKey, formatMonthDay, formatPretty, lastNDayKeys } from '@/lib/date'
import { toDisplayWeight, formatWeight, formatSignedWeight } from '@/lib/format'

export function Progress() {
  const { chronological } = useWeight()
  const { allMeals } = useNutrition()
  const { settings } = useSettings()
  const adjustments = useCollection(adjustmentsStore)

  const trend = computeWeightTrend(chronological, settings.goalWeight)

  // This week's calories (avg over logged days)
  const week = useMemo(() => {
    const last7 = new Set(lastNDayKeys(7))
    const byDate = new Map<string, number>()
    for (const m of allMeals) {
      if (last7.has(m.date)) byDate.set(m.date, (byDate.get(m.date) ?? 0) + m.calories)
    }
    const days = [...byDate.values()]
    const avg = days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : 0
    return { avg, daysLogged: days.length }
  }, [allMeals])

  // Avg daily calories per week (last 6 weeks)
  const weeklyCalories = useMemo(() => {
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const key = weekStartKey(subWeeks(new Date(), 5 - i))
      return { key, label: formatMonthDay(key), total: 0, days: new Set<string>() }
    })
    const idx = new Map(buckets.map((b, i) => [b.key, i]))
    for (const m of allMeals) {
      const i = idx.get(weekStartKey(parseKey(m.date)))
      if (i == null) continue
      buckets[i].total += m.calories
      buckets[i].days.add(m.date)
    }
    return buckets.map((b) => ({ label: b.label, value: b.days.size ? Math.round(b.total / b.days.size) : 0 }))
  }, [allMeals])

  const weightChart = chronological.map((e) => ({
    label: formatMonthDay(e.date),
    value: Number(toDisplayWeight(e.weight, settings.units.weight).toFixed(1)),
  }))

  const sortedAdjustments = [...adjustments].sort((a, b) => b.date.localeCompare(a.date))
  const hasData = chronological.length > 0 || allMeals.length > 0

  if (!hasData) {
    return (
      <TabPage title="Progress" subtitle="This week">
        <EmptyState
          icon={LineChart}
          title="Your week, at a glance"
          description="Once you log a few weigh-ins and meals, this page shows your weight trend, calorie averages, and every coach adjustment — so you always know if the plan is working."
        />
      </TabPage>
    )
  }

  return (
    <TabPage title="Progress" subtitle="This week">
      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatCard label="Avg calories" value={week.avg || '—'} sub={`${week.daysLogged}/7 days logged`} />
        <StatCard label="Calorie target" value={settings.calorieTarget} sub="auto-managed" />
        <StatCard
          label="Weekly change"
          value={trend.weeklyRate != null ? formatSignedWeight(trend.weeklyRate, settings) : '—'}
          sub={trend.avg7 != null ? `7-day avg ${formatWeight(trend.avg7, settings)}` : 'log weigh-ins'}
        />
        <StatCard
          label="Current weight"
          value={trend.current != null ? formatWeight(trend.current, settings) : '—'}
          sub={trend.projectedGoalDate ? `goal ~${formatMonthDay(trend.projectedGoalDate)}` : `goal ${formatWeight(settings.goalWeight, settings)}`}
        />
      </div>

      {week.daysLogged < 5 && (
        <Card className="mb-4 border-warning/30 bg-warning/5">
          <CardContent className="flex items-start gap-2.5 p-4">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-warning" />
            <p className="text-sm text-muted-foreground">
              You've logged {week.daysLogged} of the last 7 days. Consistent logging is what lets the coach adjust your
              calories accurately — aim for a quick entry every day.
            </p>
          </CardContent>
        </Card>
      )}

      {weightChart.length >= 2 && (
        <Section title={`Weight trend (${settings.units.weight})`} icon={Scale}>
          <LineTrend data={weightChart} suffix={settings.units.weight} />
        </Section>
      )}

      {weeklyCalories.some((w) => w.value > 0) && (
        <Section title="Avg calories per week" icon={Flame}>
          <BarSeries data={weeklyCalories} height={170} suffix="kcal" />
        </Section>
      )}

      <p className="mb-2 mt-6 flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <TrendingUp className="size-3.5" /> Calorie adjustments
      </p>
      {sortedAdjustments.length === 0 ? (
        <Card>
          <CardContent className="flex items-start gap-2.5 p-4 text-sm text-muted-foreground">
            <CalendarCheck className="mt-0.5 size-4 shrink-0" />
            <p>No changes yet. Each week the coach compares your 7-day average weight to your target pace and tweaks calories by 100–200 only when needed. Adjustments will appear here with the reasoning.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sortedAdjustments.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border/70 bg-card p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-semibold tabular-nums">
                  {a.fromCalories} → {a.toCalories} kcal
                </span>
                <span className="text-xs text-muted-foreground">{formatPretty(a.date)}</span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{a.reason}</p>
            </div>
          ))}
        </div>
      )}
    </TabPage>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Scale; children: React.ReactNode }) {
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Icon className="size-4" /> {title}
        </p>
        {children}
      </CardContent>
    </Card>
  )
}
