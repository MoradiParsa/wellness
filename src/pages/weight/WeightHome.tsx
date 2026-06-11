import { useNavigate } from 'react-router-dom'
import { Plus, Scale, History, Flag } from 'lucide-react'
import { TabPage } from '@/components/layout/TabPage'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { LineTrend } from '@/components/charts/Charts'
import { CoachCard } from '@/components/shared/CoachCard'
import { useWeight } from '@/hooks/useWeight'
import { useWorkouts } from '@/hooks/useWorkouts'
import { useSettings } from '@/hooks/useSettings'
import { computeWeightTrend, volumeWithinDays } from '@/coach/metrics'
import { bulkCutCoach } from '@/coach/phase'
import { formatWeight, formatSignedWeight, toDisplayWeight } from '@/lib/format'
import { formatMonthDay, formatPretty } from '@/lib/date'

export function WeightHome() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { entries, chronological, latest } = useWeight()
  const { workouts } = useWorkouts()

  const trend = computeWeightTrend(chronological, settings.goalWeight)
  const strengthTrendUp =
    workouts.length >= 2 && volumeWithinDays(workouts, 7) >= volumeWithinDays(workouts, 14) - volumeWithinDays(workouts, 7)
  const coach = bulkCutCoach(settings, chronological, { strengthTrendUp })

  const chartData = chronological.map((e) => ({
    label: formatMonthDay(e.date),
    value: Number(toDisplayWeight(e.weight, settings.units.weight).toFixed(1)),
  }))

  return (
    <TabPage
      title="Weight"
      right={
        <Button size="iconSm" variant="secondary" onClick={() => navigate('/weight/history')}>
          <History />
        </Button>
      }
    >
      {entries.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No weigh-ins yet"
          description="Log your weight daily — ideally fasted in the morning — to track trends and get coaching."
          action={
            <Button size="lg" onClick={() => navigate('/weight/new')}>
              <Plus className="size-4" /> Log weight
            </Button>
          }
        />
      ) : (
        <>
          <Card className="mb-4">
            <CardContent className="flex items-end justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">Current</p>
                <p className="text-4xl font-bold tabular-nums">{formatWeight(latest!.weight, settings)}</p>
                <p className="mt-1 text-xs text-muted-foreground">as of {formatPretty(latest!.date)}</p>
              </div>
              <Button onClick={() => navigate('/weight/new')}>
                <Plus className="size-4" /> Log
              </Button>
            </CardContent>
          </Card>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <StatCard label="7-day avg" value={trend.avg7 != null ? formatWeight(trend.avg7, settings) : '—'} />
            <StatCard label="30-day avg" value={trend.avg30 != null ? formatWeight(trend.avg30, settings) : '—'} />
            <StatCard
              label="Weekly change"
              value={trend.weeklyRate != null ? formatSignedWeight(trend.weeklyRate, settings) : '—'}
            />
            <StatCard
              label="Monthly change"
              value={trend.monthlyChange != null ? formatSignedWeight(trend.monthlyChange, settings) : '—'}
            />
          </div>

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

          {chartData.length >= 2 && (
            <Card className="mb-4">
              <CardContent className="p-4">
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Trend ({settings.units.weight})
                </p>
                <LineTrend data={chartData} suffix={settings.units.weight} />
              </CardContent>
            </Card>
          )}

          <CoachCard message={coach} />
        </>
      )}
    </TabPage>
  )
}
