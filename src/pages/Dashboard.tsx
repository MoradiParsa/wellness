import { useNavigate } from 'react-router-dom'
import {
  UtensilsCrossed,
  Scale,
  Dumbbell,
  ListChecks,
  Play,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { TabPage } from '@/components/layout/TabPage'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DailyCoachCard } from '@/components/shared/DailyCoachCard'
import { useSettings } from '@/hooks/useSettings'
import { useWeight } from '@/hooks/useWeight'
import { useNutrition } from '@/hooks/useNutrition'
import { useWorkouts } from '@/hooks/useWorkouts'
import { usePrograms } from '@/hooks/usePrograms'
import { useHealth } from '@/hooks/useHealth'
import { currentRecovery, type Readiness } from '@/coach/recovery'
import { buildDailyBrief } from '@/coach/dailyCoach'
import { todayKey, formatLong } from '@/lib/date'
import { formatWeight } from '@/lib/format'
import { cn } from '@/lib/utils'

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
  const { latest } = useWeight()
  const { totals } = useNutrition(today)
  const { workouts } = useWorkouts()
  const { activeProgram } = usePrograms()
  const { getByDate } = useHealth()

  const todayHealth = getByDate(today)
  const recovery = currentRecovery()
  const trainedToday = workouts.some((w) => w.date === today)

  const days = activeProgram ? [...activeProgram.days].sort((a, b) => a.order - b.order) : []
  const lastSession = workouts.find((w) => w.programId === activeProgram?.id && w.programDayId)
  const lastIdx = lastSession ? days.findIndex((d) => d.id === lastSession.programDayId) : -1
  const suggestedDay = days[lastIdx >= 0 ? (lastIdx + 1) % days.length : 0]

  const brief = buildDailyBrief()
  const calLeft = Math.round(settings.calorieTarget - totals.calories)
  const proteinLeft = Math.max(0, Math.round(settings.proteinTarget - totals.protein))

  return (
    <TabPage title={brief.name ? `${greeting()}, ${brief.name}` : greeting()} subtitle={formatLong(today)}>
      {/* Today's Snapshot — the first thing you see */}
      <div className="mb-5 rounded-3xl border border-border/80 bg-card p-4">
        <p className="mb-3 flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Sparkles className="size-3.5" /> Today's snapshot
        </p>
        <div className="grid grid-cols-4 gap-2">
          <Tile label="Weight" value={latest ? formatWeight(latest.weight, settings) : '—'} />
          <Tile label="Recovery" value={recovery.available ? String(recovery.score) : '—'} tone={recovery.available ? readinessTone(recovery.readiness) : undefined} />
          <Tile label="Cal left" value={Math.max(0, calLeft)} />
          <Tile label="Protein" value={`${proteinLeft}g`} />
          <Tile label="Workout" value={trainedToday ? 'Done' : suggestedDay ? 'Ready' : '—'} tone={trainedToday ? 'text-success' : undefined} />
          <Tile label="Steps" value={todayHealth?.steps != null ? todayHealth.steps.toLocaleString() : '—'} />
          <Tile label="Sleep" value={todayHealth?.sleepHours != null ? `${todayHealth.sleepHours}h` : '—'} />
          <Tile label="Phase" value={settings.phase} className="capitalize" />
        </div>
        {recovery.available && (
          <p className="mt-3 rounded-2xl bg-secondary/40 px-3 py-2.5 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{recovery.readiness} readiness.</span> {recovery.recommendation}
          </p>
        )}
      </div>

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
    </TabPage>
  )
}

function readinessTone(r: Readiness): string {
  return r === 'High' ? 'text-success' : r === 'Moderate' ? 'text-warning' : 'text-destructive'
}

function Tile({ label, value, sub, tone, className }: { label: string; value: string | number; sub?: string; tone?: string; className?: string }) {
  return (
    <div className="rounded-2xl bg-secondary/40 p-2.5 text-center">
      <p className={cn('truncate text-base font-bold leading-tight tabular-nums', tone, className)}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}{sub ? ` ${sub}` : ''}</p>
    </div>
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
