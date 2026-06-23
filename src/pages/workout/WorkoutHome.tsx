import { useNavigate } from 'react-router-dom'
import { Dumbbell, Pencil, History, Library, Play, ChevronRight, ClipboardList, FileSpreadsheet, Timer } from 'lucide-react'
import { TabPage } from '@/components/layout/TabPage'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { usePrograms } from '@/hooks/usePrograms'
import { useWorkouts } from '@/hooks/useWorkouts'
import { useActiveWorkout } from '@/hooks/useActiveWorkout'
import { exerciseName } from '@/hooks/useExercises'
import { formatPretty } from '@/lib/date'

export function WorkoutHome() {
  const navigate = useNavigate()
  const { activeProgram } = usePrograms()
  const { workouts } = useWorkouts()
  const session = useActiveWorkout()

  const resumeBanner = session.active && session.entries.length > 0 && (
    <button
      onClick={() => navigate(session.programDayId ? `/workout/session/${session.programDayId}` : '/workout/session')}
      className="mb-5 flex w-full items-center gap-3 rounded-3xl border border-foreground/30 bg-card p-4 text-left active:bg-secondary/50"
    >
      <span className="flex size-11 items-center justify-center rounded-2xl bg-foreground text-background">
        <Timer className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">Workout in progress</span>
        <span className="block truncate text-xs text-muted-foreground">
          {session.name} · {session.entries.filter((e) => e.sets.every((s) => s.completed) && e.sets.length > 0).length}/
          {session.entries.length} exercises done
        </span>
      </span>
      <Play className="size-4 shrink-0 text-muted-foreground" />
    </button>
  )

  if (!activeProgram) {
    return (
      <TabPage title="Workout">
        {resumeBanner}
        <EmptyState
          icon={ClipboardList}
          title="No program yet"
          description="Import your training split to start logging workouts and get progressive-overload coaching."
          action={
            <div className="flex flex-col gap-2">
              <Button size="lg" onClick={() => navigate('/workout/program/import')}>
                <FileSpreadsheet className="size-5" /> Import from spreadsheet
              </Button>
              <Button variant="secondary" onClick={() => navigate('/workout/program/new')}>
                Build program by hand
              </Button>
              <Button variant="ghost" onClick={() => navigate('/workout/exercises')}>
                Browse exercise library
              </Button>
            </div>
          }
        />
      </TabPage>
    )
  }

  const days = [...activeProgram.days].sort((a, b) => a.order - b.order)
  const lastSession = workouts.find((w) => w.programId === activeProgram.id && w.programDayId)
  const lastIdx = lastSession ? days.findIndex((d) => d.id === lastSession.programDayId) : -1
  const suggested = days[lastIdx >= 0 ? (lastIdx + 1) % days.length : 0]

  return (
    <TabPage
      title="Workout"
      subtitle={activeProgram.name}
      right={
        <Button
          size="iconSm"
          variant="secondary"
          onClick={() => navigate(`/workout/program/${activeProgram.id}/edit`)}
        >
          <Pencil />
        </Button>
      }
    >
      {resumeBanner}
      {suggested && (
        <Card className="mb-5 overflow-hidden">
          <CardContent className="p-5">
            <Badge variant="outline" className="mb-2">
              Up next
            </Badge>
            <h2 className="text-2xl font-bold">{suggested.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {suggested.exercises.length} exercises ·{' '}
              {suggested.exercises.reduce((s, e) => s + e.targetSets, 0)} sets
            </p>
            <Button size="lg" className="mt-4 w-full" onClick={() => navigate(`/workout/session/${suggested.id}`)}>
              <Play className="size-5" /> Start workout
            </Button>
          </CardContent>
        </Card>
      )}

      <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Training days
      </p>
      <div className="mb-5 space-y-2">
        {days.map((day) => (
          <button
            key={day.id}
            onClick={() => navigate(`/workout/session/${day.id}`)}
            className="flex w-full items-center gap-3 rounded-2xl border border-border/80 bg-card px-4 py-3.5 text-left active:bg-secondary/50"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-secondary">
              <Dumbbell className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{day.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {day.exercises.map((e) => exerciseName(e.exerciseId)).slice(0, 3).join(' · ') ||
                  'Empty day'}
              </span>
            </span>
            <Play className="size-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" className="h-12" onClick={() => navigate('/workout/exercises')}>
          <Library className="size-4" /> Exercises
        </Button>
        <Button variant="secondary" className="h-12" onClick={() => navigate('/workout/history')}>
          <History className="size-4" /> History
        </Button>
      </div>

      {workouts.length > 0 && (
        <>
          <button
            onClick={() => navigate('/workout/history')}
            className="mb-2 mt-6 flex w-full items-center justify-between px-1"
          >
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recent
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
          <div className="space-y-2">
            {workouts.slice(0, 3).map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-2xl border border-border/70 bg-card px-4 py-3">
                <div>
                  <p className="text-[15px] font-medium">{w.name}</p>
                  <p className="text-xs text-muted-foreground">{formatPretty(w.date)}</p>
                </div>
                <Badge variant="outline">{w.entries.length} lifts</Badge>
              </div>
            ))}
          </div>
        </>
      )}
    </TabPage>
  )
}
