import { useParams, useNavigate } from 'react-router-dom'
import { Dumbbell, Trash2, Trophy, Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { FullScreenPage } from '@/components/layout/FullScreenPage'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LineTrend } from '@/components/charts/Charts'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { toast } from '@/components/ui/sonner'
import { useExercises } from '@/hooks/useExercises'
import { useWorkouts, allEntriesForExercise } from '@/hooks/useWorkouts'
import { usePrograms } from '@/hooks/usePrograms'
import { useSettings } from '@/hooks/useSettings'
import { strengthSeries, exercisePRs, totalVolume, epley1RM, bestSet } from '@/coach/metrics'
import { suggestOverloadTrend } from '@/coach/overload'
import { toDisplayWeight, formatWeight } from '@/lib/format'
import { formatMonthDay, formatPretty } from '@/lib/date'
import { cn } from '@/lib/utils'

export function ExerciseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getById, remove } = useExercises()
  const { workouts } = useWorkouts()
  const { activeProgram } = usePrograms()
  const { settings } = useSettings()

  const exercise = id ? getById(id) : undefined
  if (!exercise) {
    return (
      <FullScreenPage title="Exercise">
        <EmptyState icon={Dumbbell} title="Exercise not found" />
      </FullScreenPage>
    )
  }

  const series = strengthSeries(workouts, exercise.id)
  const pr = exercisePRs(workouts, exercise.id)
  const vol = totalVolume(workouts, exercise.id)
  const chrono = allEntriesForExercise(exercise.id) // oldest → newest
  const history = [...chrono].reverse()
  const target = activeProgram?.days.flatMap((d) => d.exercises).find((e) => e.exerciseId === exercise.id)
  const rec = chrono.length
    ? suggestOverloadTrend({ exerciseId: exercise.id, settings, target, history: chrono.map((h) => h.entry) })
    : null
  const chartData = series.map((p) => ({
    label: formatMonthDay(p.date),
    value: Number(toDisplayWeight(p.e1rm, settings.units.weight).toFixed(1)),
  }))

  return (
    <FullScreenPage
      title={exercise.name}
      right={
        exercise.isCustom ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="iconSm" variant="ghost">
                <Trash2 className="text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete exercise?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes “{exercise.name}” from your library. Logged history stays intact.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction
                  onClick={() => {
                    remove(exercise.id)
                    toast.success('Exercise deleted')
                    navigate(-1)
                  }}
                >
                  Delete
                </AlertDialogAction>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : undefined
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="secondary">{exercise.muscleGroup}</Badge>
        <Badge variant="outline">{exercise.equipment}</Badge>
        <Badge variant="outline" className="capitalize">{exercise.category}</Badge>
      </div>

      {history.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="No history yet"
          description="Log this exercise in a workout to start tracking strength, volume, and PRs."
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <Stat label="Est. 1RM" value={formatWeight(pr.maxE1RM, settings)} icon />
            <Stat label="Best set" value={`${formatWeight(pr.maxWeight, settings)} × ${pr.maxWeightReps}`} />
            <Stat label="Best reps" value={`${pr.maxReps}`} />
            <Stat label="Total volume" value={formatWeight(vol, settings, 0)} />
          </div>

          {rec && <RecommendationCard rec={rec} />}

          {chartData.length >= 2 && (
            <Card className="mb-4">
              <CardContent className="p-4">
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Estimated 1RM trend ({settings.units.weight})
                </p>
                <LineTrend data={chartData} suffix={settings.units.weight} />
              </CardContent>
            </Card>
          )}

          <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            History
          </p>
          <div className="space-y-2">
            {history.map(({ date, entry }, i) => {
              const best = bestSet(entry)
              return (
                <div key={i} className="rounded-2xl border border-border/70 bg-card px-4 py-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[15px] font-medium">{formatPretty(date)}</span>
                    {best && (
                      <Badge variant="outline">
                        e1RM {formatWeight(epley1RM(best.weight, best.reps), settings, 0)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {entry.sets
                      .filter((s) => s.reps > 0)
                      .map((s) => `${Number(toDisplayWeight(s.weight, settings.units.weight).toFixed(1))}×${s.reps}`)
                      .join(' · ')}
                  </p>
                </div>
              )
            })}
          </div>
        </>
      )}
    </FullScreenPage>
  )
}

function RecommendationCard({ rec }: { rec: ReturnType<typeof suggestOverloadTrend> }) {
  const Icon = rec.action === 'increase' ? TrendingUp : rec.action === 'decrease' ? TrendingDown : Minus
  const confTone =
    rec.confidence === 'High' ? 'border-success/40 text-success' : rec.confidence === 'Medium' ? 'border-warning/40 text-warning' : 'border-border text-muted-foreground'
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Sparkles className="size-3.5" /> Coach recommendation
          </span>
          <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', confTone)}>{rec.confidence} confidence</span>
        </div>
        <p className="flex items-start gap-2 text-[15px] font-semibold">
          <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          {rec.message}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{rec.reasoning}</p>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: boolean }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4">
      <div className="mb-0.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon && <Trophy className="size-3.5" />}
        {label}
      </div>
      <p className="text-lg font-bold tabular-nums">{value}</p>
    </div>
  )
}
