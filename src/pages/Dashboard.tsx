import { useNavigate } from 'react-router-dom'
import {
  UtensilsCrossed,
  Scale,
  Dumbbell,
  ListChecks,
  Flame,
  Play,
  Check,
  CheckCircle2,
  LineChart,
  ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { TabPage } from '@/components/layout/TabPage'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { StatCard } from '@/components/shared/StatCard'
import { DailyCoachCard } from '@/components/shared/DailyCoachCard'
import { useSettings } from '@/hooks/useSettings'
import { useWeight } from '@/hooks/useWeight'
import { useNutrition } from '@/hooks/useNutrition'
import { useWorkouts } from '@/hooks/useWorkouts'
import { usePrograms } from '@/hooks/usePrograms'
import { useTasks } from '@/hooks/useTasks'
import { computeWeightTrend, currentStreak } from '@/coach/metrics'
import { buildDailyBrief } from '@/coach/dailyCoach'
import { todayKey, formatLong } from '@/lib/date'
import { formatWeight, clamp } from '@/lib/format'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function Dashboard() {
  const navigate = useNavigate()
  const today = todayKey()
  const { settings } = useSettings()
  const { latest, chronological } = useWeight()
  const { totals } = useNutrition(today)
  const { workouts } = useWorkouts()
  const { activeProgram } = usePrograms()
  const { tasks } = useTasks()

  const trend = computeWeightTrend(chronological, settings.goalWeight)
  const streak = currentStreak(workouts.map((w) => w.date))
  const trainedToday = workouts.some((w) => w.date === today)

  const days = activeProgram ? [...activeProgram.days].sort((a, b) => a.order - b.order) : []
  const lastSession = workouts.find((w) => w.programId === activeProgram?.id && w.programDayId)
  const lastIdx = lastSession ? days.findIndex((d) => d.id === lastSession.programDayId) : -1
  const suggestedDay = days[lastIdx >= 0 ? (lastIdx + 1) % days.length : 0]

  const todayTasks = tasks.filter((t) => !t.dueDate || t.dueDate === today)
  const doneTasks = todayTasks.filter((t) => t.completed).length

  const brief = buildDailyBrief()
  const calLeft = Math.round(settings.calorieTarget - totals.calories)
  const proteinLeft = Math.max(0, Math.round(settings.proteinTarget - totals.protein))

  return (
    <TabPage title={brief.name ? `${greeting()}, ${brief.name}` : greeting()} subtitle={formatLong(today)}>
      <div className="mb-5 grid grid-cols-4 gap-2">
        <QuickAdd icon={UtensilsCrossed} label="Meal" onClick={() => navigate(`/nutrition/add?date=${today}`)} />
        <QuickAdd icon={Scale} label="Weight" onClick={() => navigate('/weight/new')} />
        <QuickAdd
          icon={Dumbbell}
          label="Workout"
          onClick={() => navigate(suggestedDay ? `/workout/session/${suggestedDay.id}` : '/workout')}
        />
        <QuickAdd icon={ListChecks} label="Task" onClick={() => navigate('/tasks')} />
      </div>

      <div className="mb-4">
        <DailyCoachCard brief={brief} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatCard
          label="Weight"
          value={latest ? formatWeight(latest.weight, settings) : '—'}
          sub={trend.avg7 != null ? `7-day avg ${formatWeight(trend.avg7, settings)}` : 'No data yet'}
          onClick={() => navigate('/weight')}
        />
        <StatCard
          label="Calories left"
          value={calLeft}
          sub={`${Math.round(totals.calories)} / ${settings.calorieTarget} kcal`}
          onClick={() => navigate('/nutrition')}
        />
        <StatCard
          label="Protein left"
          value={`${proteinLeft}g`}
          sub={`${Math.round(totals.protein)} / ${settings.proteinTarget}g`}
          onClick={() => navigate('/nutrition')}
        />
        <StatCard
          label="Workout streak"
          value={
            <span className="flex items-center gap-1.5">
              {streak}
              <Flame className={streak > 0 ? 'size-5 text-warning' : 'size-5 text-muted-foreground/40'} />
            </span>
          }
          sub={streak === 1 ? 'day' : 'days'}
          onClick={() => navigate('/workout/history')}
        />
      </div>

      {/* Today's workout */}
      <Card className="mb-4">
        <CardContent className="flex items-center gap-4 p-4">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary">
            {trainedToday ? <CheckCircle2 className="size-6 text-success" /> : <Dumbbell className="size-6" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Today's workout</p>
            <p className="truncate font-semibold">
              {trainedToday ? 'Completed — nice work' : suggestedDay ? suggestedDay.name : 'No program yet'}
            </p>
          </div>
          {!trainedToday &&
            (suggestedDay ? (
              <Button size="sm" onClick={() => navigate(`/workout/session/${suggestedDay.id}`)}>
                <Play className="size-4" /> Start
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => navigate('/workout/program/new')}>
                Set up
              </Button>
            ))}
        </CardContent>
      </Card>

      {/* Tasks today */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <button onClick={() => navigate('/tasks')} className="mb-2 flex w-full items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Check className="size-4 text-muted-foreground" /> Tasks today
            </span>
            <span className="text-sm tabular-nums text-muted-foreground">
              {doneTasks} / {todayTasks.length}
            </span>
          </button>
          <Progress value={todayTasks.length ? clamp((doneTasks / todayTasks.length) * 100, 0, 100) : 0} indicatorClassName="bg-success" />
        </CardContent>
      </Card>

      <button
        onClick={() => navigate('/progress')}
        className="flex w-full items-center gap-3 rounded-3xl border border-border/80 bg-card p-4 text-left active:bg-secondary/50"
      >
        <span className="flex size-10 items-center justify-center rounded-2xl bg-secondary">
          <LineChart className="size-5" />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold">Weekly progress</span>
          <span className="block text-xs text-muted-foreground">Weight trend, calories & coach adjustments</span>
        </span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </button>
    </TabPage>
  )
}

function QuickAdd({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 rounded-2xl bg-secondary/60 py-3 tap-scale active:bg-secondary">
      <span className="flex size-10 items-center justify-center rounded-full bg-background">
        <Icon className="size-5" />
      </span>
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  )
}
