import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Check, Plus, Trash2, Timer, X, Dumbbell, TrendingUp } from 'lucide-react'
import { FullScreenPage } from '@/components/layout/FullScreenPage'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExercisePickerSheet } from '@/components/workout/ExercisePickerSheet'
import { toast } from '@/components/ui/sonner'
import { useSettings } from '@/hooks/useSettings'
import { usePrograms } from '@/hooks/usePrograms'
import { useWorkouts, lastEntryForExercise } from '@/hooks/useWorkouts'
import { exerciseName } from '@/hooks/useExercises'
import { suggestOverload } from '@/coach/overload'
import { uid } from '@/lib/id'
import { todayKey } from '@/lib/date'
import { toDisplayWeight, fromDisplayWeight } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SetLog, ProgramExercise, WorkoutEntry } from '@/types'

interface LiveEntry {
  exerciseId: string
  target?: ProgramExercise
  sets: SetLog[]
  notes?: string
}

function blankSet(weight = 0, target?: ProgramExercise): SetLog {
  return {
    id: uid(),
    weight,
    reps: 0,
    completed: false,
    restSec: target?.restSec,
    tempo: target?.tempo,
    rpe: undefined,
    rir: undefined,
  }
}

export function ActiveSession() {
  const { dayId } = useParams()
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { activeProgram } = usePrograms()
  const { create } = useWorkouts()
  const unit = settings.units.weight

  const day = activeProgram?.days.find((d) => d.id === dayId)
  const startedAt = useRef(Date.now())

  const [entries, setEntries] = useState<LiveEntry[]>(() => {
    if (!day) return []
    return day.exercises.map((pe) => {
      const prev = lastEntryForExercise(pe.exerciseId)
      const sugg = suggestOverload({ exerciseId: pe.exerciseId, settings, target: pe, lastEntry: prev?.entry })
      const w = sugg.suggestedWeight || pe.startingWeight
      return {
        exerciseId: pe.exerciseId,
        target: pe,
        sets: Array.from({ length: Math.max(1, pe.targetSets) }, () => blankSet(w, pe)),
      }
    })
  })

  const [pickerOpen, setPickerOpen] = useState(false)
  const [sessionNotes, setSessionNotes] = useState('')

  // Rest timer
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (restEndsAt == null) return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [restEndsAt])
  const restRemaining = restEndsAt ? Math.max(0, Math.ceil((restEndsAt - now) / 1000)) : 0
  useEffect(() => {
    if (restEndsAt != null && Date.now() >= restEndsAt) setRestEndsAt(null)
  }, [now, restEndsAt])

  const patchSet = (ei: number, si: number, patch: Partial<SetLog>) =>
    setEntries((es) =>
      es.map((e, i) =>
        i === ei ? { ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) } : e,
      ),
    )

  const completeSet = (ei: number, si: number) => {
    const entry = entries[ei]
    const set = entry.sets[si]
    const nextCompleted = !set.completed
    patchSet(ei, si, { completed: nextCompleted })
    if (nextCompleted) {
      const rest = entry.target?.restSec ?? set.restSec ?? 120
      if (rest > 0) setRestEndsAt(Date.now() + rest * 1000)
    }
  }

  const addSet = (ei: number) =>
    setEntries((es) =>
      es.map((e, i) => {
        if (i !== ei) return e
        const last = e.sets[e.sets.length - 1]
        return { ...e, sets: [...e.sets, blankSet(last?.weight ?? 0, e.target)] }
      }),
    )

  const removeSet = (ei: number, si: number) =>
    setEntries((es) =>
      es.map((e, i) => (i === ei ? { ...e, sets: e.sets.filter((_, j) => j !== si) } : e)),
    )

  const removeEntry = (ei: number) => setEntries((es) => es.filter((_, i) => i !== ei))

  const addExercise = (exerciseId: string) => {
    const prev = lastEntryForExercise(exerciseId)
    const w = prev?.entry.sets.find((s) => s.weight > 0)?.weight ?? 0
    setEntries((es) => [...es, { exerciseId, sets: [blankSet(w)] }])
  }

  const finish = () => {
    const workoutEntries: WorkoutEntry[] = entries
      .map((e) => ({
        exerciseId: e.exerciseId,
        sets: e.sets.filter((s) => s.reps > 0),
        notes: e.notes,
      }))
      .filter((e) => e.sets.length > 0)

    if (workoutEntries.length === 0) {
      toast.error('Log at least one set before finishing.')
      return
    }

    create({
      date: todayKey(),
      programId: activeProgram?.id,
      programDayId: day?.id,
      name: day?.name ?? 'Workout',
      entries: workoutEntries,
      durationSec: Math.round((Date.now() - startedAt.current) / 1000),
      sessionNotes: sessionNotes.trim() || undefined,
    })
    toast.success('Workout saved 💪')
    navigate('/workout', { replace: true })
  }

  return (
    <FullScreenPage
      title={day?.name ?? 'Workout'}
      noSwipe
      footer={
        <Button size="lg" className="w-full" onClick={finish}>
          <Check className="size-5" /> Finish workout
        </Button>
      }
    >
      {entries.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Empty session"
          description="Add exercises to start logging your sets."
          action={<Button onClick={() => setPickerOpen(true)}><Plus className="size-4" /> Add exercise</Button>}
        />
      ) : (
        <div className="space-y-4">
          {entries.map((entry, ei) => (
            <ExerciseBlock
              key={`${entry.exerciseId}-${ei}`}
              entry={entry}
              unit={unit}
              onPatchSet={(si, patch) => patchSet(ei, si, patch)}
              onComplete={(si) => completeSet(ei, si)}
              onAddSet={() => addSet(ei)}
              onRemoveSet={(si) => removeSet(ei, si)}
              onRemove={() => removeEntry(ei)}
            />
          ))}

          <Button variant="outline" className="w-full" onClick={() => setPickerOpen(true)}>
            <Plus className="size-4" /> Add exercise
          </Button>

          <Textarea
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder="Session notes (energy, sleep, pumps…)"
          />
        </div>
      )}

      {restRemaining > 0 && (
        <div className="fixed inset-x-0 bottom-24 z-40 mx-auto max-w-md px-5">
          <div className="flex items-center gap-3 rounded-2xl bg-foreground px-4 py-3 text-background shadow-xl">
            <Timer className="size-5" />
            <span className="flex-1 font-semibold tabular-nums">
              Rest · {Math.floor(restRemaining / 60)}:{String(restRemaining % 60).padStart(2, '0')}
            </span>
            <button onClick={() => setRestEndsAt((p) => (p ?? Date.now()) + 15000)} className="rounded-lg px-2 py-1 text-sm font-medium opacity-80">
              +15s
            </button>
            <button onClick={() => setRestEndsAt(null)} className="rounded-lg p-1">
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      <ExercisePickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={addExercise}
      />
    </FullScreenPage>
  )
}

function ExerciseBlock({
  entry,
  unit,
  onPatchSet,
  onComplete,
  onAddSet,
  onRemoveSet,
  onRemove,
}: {
  entry: LiveEntry
  unit: 'lb' | 'kg'
  onPatchSet: (si: number, patch: Partial<SetLog>) => void
  onComplete: (si: number) => void
  onAddSet: () => void
  onRemoveSet: (si: number) => void
  onRemove: () => void
}) {
  const { settings } = useSettings()
  const prev = lastEntryForExercise(entry.exerciseId)
  const sugg = suggestOverload({
    exerciseId: entry.exerciseId,
    settings,
    target: entry.target,
    lastEntry: prev?.entry,
  })

  const prevSummary = prev
    ? prev.entry.sets
        .filter((s) => s.reps > 0)
        .map((s) => `${Number(toDisplayWeight(s.weight, unit).toFixed(1))}×${s.reps}`)
        .join(', ')
    : null

  return (
    <div className="rounded-3xl border border-border/80 bg-card p-4">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[17px] font-semibold">{exerciseName(entry.exerciseId)}</h3>
          {entry.target && (
            <p className="text-xs text-muted-foreground">
              Target {entry.target.targetSets}×{entry.target.repsLow}-{entry.target.repsHigh}
              {entry.target.targetRPE != null && ` · RPE ${entry.target.targetRPE}`}
              {entry.target.tempo && ` · tempo ${entry.target.tempo}`}
            </p>
          )}
        </div>
        <button onClick={onRemove} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground active:bg-secondary">
          <Trash2 className="size-4" />
        </button>
      </div>

      {sugg.action !== 'none' && (
        <div className="mb-3 flex items-start gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
          <TrendingUp className="mt-0.5 size-3.5 shrink-0" />
          <span>{sugg.message}</span>
        </div>
      )}
      {prevSummary && (
        <p className="mb-2 px-1 text-xs text-muted-foreground">Last time: {prevSummary}</p>
      )}

      <div className="mb-1 grid grid-cols-[1.5rem_1fr_1fr_2.75rem_2.25rem] items-center gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>#</span>
        <span className="text-center">{unit}</span>
        <span className="text-center">reps</span>
        <span className="text-center">rpe</span>
        <span />
      </div>

      <div className="space-y-1.5">
        {entry.sets.map((set, si) => (
          <div
            key={set.id}
            className={cn(
              'grid grid-cols-[1.5rem_1fr_1fr_2.75rem_2.25rem] items-center gap-2 rounded-xl px-1 py-1',
              set.completed && 'bg-success/10',
            )}
          >
            <span className="text-center text-sm font-medium text-muted-foreground">{si + 1}</span>
            <input
              type="number"
              inputMode="decimal"
              value={set.weight ? Number(toDisplayWeight(set.weight, unit).toFixed(1)) : ''}
              placeholder="0"
              onChange={(e) =>
                onPatchSet(si, { weight: fromDisplayWeight(Number(e.target.value) || 0, unit) })
              }
              className="h-10 w-full rounded-lg border border-input bg-secondary/40 text-center text-[15px] font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/50"
            />
            <input
              type="number"
              inputMode="numeric"
              value={set.reps || ''}
              placeholder={entry.target ? String(entry.target.repsHigh) : '0'}
              onChange={(e) => onPatchSet(si, { reps: Number(e.target.value) || 0 })}
              className="h-10 w-full rounded-lg border border-input bg-secondary/40 text-center text-[15px] font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/50"
            />
            <input
              type="number"
              inputMode="decimal"
              value={set.rpe ?? ''}
              placeholder="–"
              onChange={(e) => onPatchSet(si, { rpe: e.target.value ? Number(e.target.value) : undefined })}
              className="h-10 w-full rounded-lg border border-input bg-secondary/40 text-center text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/50"
            />
            <button
              onClick={() => onComplete(si)}
              className={cn(
                'flex size-9 items-center justify-center rounded-lg transition-colors',
                set.completed ? 'bg-success text-success-foreground' : 'bg-secondary text-muted-foreground',
              )}
            >
              <Check className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onAddSet}>
          <Plus className="size-4" /> Add set
        </Button>
        {entry.sets.length > 1 && (
          <Button variant="ghost" size="sm" onClick={() => onRemoveSet(entry.sets.length - 1)}>
            Remove
          </Button>
        )}
      </div>
    </div>
  )
}
