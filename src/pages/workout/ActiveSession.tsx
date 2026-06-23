import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Check,
  Plus,
  Timer,
  X,
  Dumbbell,
  ListChecks,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Pencil,
} from 'lucide-react'
import { FullScreenPage } from '@/components/layout/FullScreenPage'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExercisePickerSheet } from '@/components/workout/ExercisePickerSheet'
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
import { useSettings } from '@/hooks/useSettings'
import { usePrograms } from '@/hooks/usePrograms'
import { useWorkouts, lastEntryForExercise } from '@/hooks/useWorkouts'
import { exerciseName, getExercise } from '@/hooks/useExercises'
import {
  useActiveWorkout,
  startSession,
  discardSession,
  setCurrentIndex,
  patchSet,
  logSet,
  reopenSet,
  addSet,
  removeSet,
  addExtraExercise,
  setSessionNotes,
  extendRest,
  cancelRest,
  isEntryComplete,
  nextIncompleteIndex,
  blankSet,
} from '@/hooks/useActiveWorkout'
import { activeSessionStore } from '@/data/collections'
import { suggestOverload, nextSetCue, loadSteps, type NextSetCue } from '@/coach/overload'
import { todayKey } from '@/lib/date'
import { toDisplayWeight, fromDisplayWeight } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ActiveDraftEntry, ProgramExercise, Settings } from '@/types'

const num = (v: number) => Number(v.toFixed(1))

/** Build a live entry for a planned exercise, pre-filled with the coach's start weight. */
function buildEntry(pe: ProgramExercise, settings: Settings): ActiveDraftEntry {
  const prev = lastEntryForExercise(pe.exerciseId)
  const sugg = suggestOverload({ exerciseId: pe.exerciseId, settings, target: pe, lastEntry: prev?.entry })
  const w = sugg.suggestedWeight || pe.startingWeight || 0
  return {
    exerciseId: pe.exerciseId,
    target: pe,
    sets: Array.from({ length: Math.max(1, pe.targetSets) }, () => blankSet(w, pe)),
  }
}

export function ActiveSession() {
  const { dayId } = useParams()
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { activeProgram } = usePrograms()
  const { create } = useWorkouts()
  const draft = useActiveWorkout()
  const unit = settings.units.weight

  const [view, setView] = useState<'exercise' | 'list'>('exercise')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [now, setNow] = useState(Date.now())

  // ---- start a fresh session or resume the persisted one -------------------
  const inited = useRef(false)
  useEffect(() => {
    if (inited.current) return
    inited.current = true
    const cur = activeSessionStore.get()
    const hasLogged = cur.active && cur.entries.some((e) => e.sets.some((s) => s.completed))
    if (cur.active && (!dayId || cur.programDayId === dayId || hasLogged)) return // resume
    if (dayId && activeProgram) {
      const day = activeProgram.days.find((d) => d.id === dayId)
      if (day) {
        startSession({
          name: day.name,
          programId: activeProgram.id,
          programDayId: day.id,
          entries: day.exercises.map((pe) => buildEntry(pe, settings)),
        })
        return
      }
    }
    startSession({ name: 'Quick workout', entries: [] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- rest timer ----------------------------------------------------------
  useEffect(() => {
    if (draft.restEndsAt == null) return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [draft.restEndsAt])

  const restRemaining = draft.restEndsAt ? Math.max(0, Math.ceil((draft.restEndsAt - now) / 1000)) : 0

  // Expire the rest timer; auto-advance to the next exercise when it followed a final set.
  useEffect(() => {
    if (draft.restEndsAt == null || now < draft.restEndsAt) return
    const advance = draft.advanceAfterRest
    cancelRest()
    if (advance) {
      const ni = nextIncompleteIndex(draft.entries, draft.currentIndex)
      if (ni != null) {
        setCurrentIndex(ni)
        setView('exercise')
      }
    }
  }, [now, draft.restEndsAt, draft.advanceAfterRest, draft.entries, draft.currentIndex])

  // ---- actions -------------------------------------------------------------
  const finish = () => {
    const d = activeSessionStore.get()
    const workoutEntries = d.entries
      .map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.filter((s) => s.reps > 0), notes: e.notes }))
      .filter((e) => e.sets.length > 0)
    if (workoutEntries.length === 0) {
      toast.error('Log at least one set before finishing.')
      return
    }
    create({
      date: todayKey(),
      programId: d.programId,
      programDayId: d.programDayId,
      name: d.name || 'Workout',
      entries: workoutEntries,
      durationSec: Math.round((Date.now() - d.startedAt) / 1000),
      sessionNotes: d.sessionNotes.trim() || undefined,
    })
    discardSession()
    toast.success('Workout saved 💪')
    navigate('/workout', { replace: true })
  }

  const discardAndLeave = () => {
    discardSession()
    navigate('/workout', { replace: true })
  }

  const onPickExtra = (exerciseId: string) => {
    const prev = lastEntryForExercise(exerciseId)
    const w = prev?.entry.sets.find((s) => s.weight > 0)?.weight ?? 0
    addExtraExercise(exerciseId, w)
    setView('exercise')
  }

  if (!draft.active) return null

  const entries = draft.entries
  const restPill = restRemaining > 0 && (
    <div className="fixed inset-x-0 bottom-24 z-40 mx-auto max-w-md px-5">
      <div className="flex items-center gap-3 rounded-2xl bg-foreground px-4 py-3 text-background shadow-xl">
        <Timer className="size-5" />
        <span className="flex-1 text-sm font-semibold tabular-nums">
          {draft.advanceAfterRest ? 'Rest · next exercise in ' : 'Rest · '}
          {Math.floor(restRemaining / 60)}:{String(restRemaining % 60).padStart(2, '0')}
        </span>
        <button onClick={() => extendRest(15000)} className="rounded-lg px-2 py-1 text-sm font-medium opacity-80">
          +15s
        </button>
        <button onClick={cancelRest} className="rounded-lg p-1">
          <X className="size-4" />
        </button>
      </div>
    </div>
  )

  // ---- empty (quick) session ----------------------------------------------
  if (entries.length === 0) {
    return (
      <FullScreenPage title={draft.name || 'Workout'} noSwipe>
        <EmptyState
          icon={Dumbbell}
          title="Empty session"
          description="Add an exercise to start logging your sets."
          action={
            <div className="flex flex-col gap-2">
              <Button onClick={() => setPickerOpen(true)}>
                <Plus className="size-4" /> Add exercise
              </Button>
              <Button variant="ghost" onClick={discardAndLeave}>
                Discard
              </Button>
            </div>
          }
        />
        <ExercisePickerSheet open={pickerOpen} onOpenChange={setPickerOpen} onSelect={onPickExtra} />
      </FullScreenPage>
    )
  }

  const ci = Math.min(draft.currentIndex, entries.length - 1)
  const entry = entries[ci]
  const ex = getExercise(entry.exerciseId)
  const equipment = ex?.equipment
  const repsLow = entry.target?.repsLow ?? 8
  const repsHigh = entry.target?.repsHigh ?? 12
  const currentSetIndex = entry.sets.findIndex((s) => !s.completed)
  const complete = currentSetIndex === -1
  const completedSets = entry.sets.filter((s) => s.completed)
  const completedCount = completedSets.length

  const prev = lastEntryForExercise(entry.exerciseId)
  const prevSummary = prev
    ? prev.entry.sets
        .filter((s) => s.reps > 0)
        .map((s) => `${num(toDisplayWeight(s.weight, unit))}×${s.reps}`)
        .join(', ')
    : null

  // Cue derived from the most recent completed set (drives the next set's prefill + chips).
  const sourceSet = complete
    ? completedSets[completedCount - 1]
    : currentSetIndex > 0
      ? entry.sets[currentSetIndex - 1]
      : null
  const cue: NextSetCue | null =
    sourceSet && sourceSet.reps > 0
      ? nextSetCue({ settings, equipment, repsLow, repsHigh, weightKg: sourceSet.weight, reps: sourceSet.reps, rpe: sourceSet.rpe })
      : null

  const nextIdx = nextIncompleteIndex(entries, ci)
  const nextEntry = nextIdx != null ? entries[nextIdx] : null

  const baseStep = loadSteps(unit, equipment)[0] ?? (unit === 'lb' ? 5 : 2.5)
  const step = (dir: 1 | -1) => {
    const cur = num(toDisplayWeight(entry.sets[currentSetIndex].weight, unit))
    patchSet(ci, currentSetIndex, { weight: fromDisplayWeight(Math.max(0, cur + dir * baseStep), unit) })
  }

  const onLog = () => {
    const set = entry.sets[currentSetIndex]
    if (!set || set.reps <= 0) {
      toast.error('Enter your reps to log the set.')
      return
    }
    const c = nextSetCue({ settings, equipment, repsLow, repsHigh, weightKg: set.weight, reps: set.reps, rpe: set.rpe })
    const restSec = entry.target?.restSec ?? set.restSec ?? 120
    logSet(ci, currentSetIndex, restSec, c.primary)
  }

  const goNext = () => {
    cancelRest()
    if (nextIdx != null) {
      setCurrentIndex(nextIdx)
      setView('exercise')
    }
  }

  const topSet = completedSets.reduce<{ weight: number; reps: number } | null>(
    (best, s) => (!best || s.weight > best.weight ? { weight: s.weight, reps: s.reps } : best),
    null,
  )

  const right =
    view === 'exercise' ? (
      <button
        onClick={() => setView('list')}
        className="flex h-9 items-center gap-1.5 rounded-full bg-secondary px-3 text-[13px] font-medium tap-scale"
      >
        <ListChecks className="size-4" /> {ci + 1}/{entries.length}
      </button>
    ) : (
      <Button size="sm" variant="ghost" onClick={() => setView('exercise')}>
        Done
      </Button>
    )

  const footer =
    view === 'list' ? undefined : !complete ? (
      <Button size="lg" className="w-full" onClick={onLog}>
        <Check className="size-5" /> Log set {currentSetIndex + 1}
      </Button>
    ) : nextIdx != null ? (
      <Button size="lg" className="w-full" onClick={goNext}>
        <ArrowRight className="size-5" /> Next: {exerciseName(nextEntry!.exerciseId)}
      </Button>
    ) : (
      <Button size="lg" className="w-full" onClick={finish}>
        <Check className="size-5" /> Finish workout
      </Button>
    )

  return (
    <FullScreenPage title={draft.name || 'Workout'} noSwipe right={right} footer={footer}>
      {view === 'list' ? (
        <div className="space-y-2">
          <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Exercises</p>
          {entries.map((e, i) => {
            const done = isEntryComplete(e)
            const planned = e.target?.targetSets ?? e.sets.length
            const logged = e.sets.filter((s) => s.completed).length
            return (
              <button
                key={i}
                onClick={() => {
                  setCurrentIndex(i)
                  setView('exercise')
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left active:bg-secondary/50',
                  i === ci ? 'border-foreground/40' : 'border-border/70',
                )}
              >
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-xl',
                    done ? 'bg-success text-success-foreground' : 'bg-secondary',
                  )}
                >
                  {done ? <Check className="size-4" /> : <span className="text-sm font-semibold">{i + 1}</span>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{exerciseName(e.exerciseId)}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {e.target ? `${e.target.targetSets}×${e.target.repsLow}–${e.target.repsHigh}` : `${e.sets.length} sets`}
                    {e.extra && ' · extra'}
                  </span>
                </span>
                <Badge variant={done ? 'secondary' : 'outline'}>
                  {done ? 'Done' : i === ci ? 'Current' : `${logged}/${planned}`}
                </Badge>
              </button>
            )
          })}

          <Button variant="outline" className="mt-1 w-full" onClick={() => setPickerOpen(true)}>
            <Plus className="size-4" /> Add extra exercise
          </Button>

          <Textarea
            value={draft.sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder="Session notes (energy, sleep, pumps…)"
            className="mt-2"
          />

          <Button size="lg" className="mt-2 w-full" onClick={finish}>
            <Check className="size-5" /> Finish workout
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="w-full text-destructive">
                Discard workout
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Discard this workout?</AlertDialogTitle>
                <AlertDialogDescription>
                  Everything you've logged in this session will be deleted. This can't be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction onClick={discardAndLeave}>Discard</AlertDialogAction>
                <AlertDialogCancel>Keep going</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : (
        <>
          <div className="mb-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Exercise {ci + 1} of {entries.length}
              {entry.extra && ' · extra'}
            </p>
            <h2 className="text-2xl font-bold leading-tight">{exerciseName(entry.exerciseId)}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {ex && <Badge variant="secondary">{ex.muscleGroup}</Badge>}
              {ex && <Badge variant="outline">{ex.equipment}</Badge>}
              <span>
                {entry.target
                  ? `Target ${entry.target.targetSets}×${entry.target.repsLow}–${entry.target.repsHigh}`
                  : `${repsLow}–${repsHigh} reps`}
                {entry.target?.targetRPE != null && ` · RPE ${entry.target.targetRPE}`}
              </span>
            </div>
            {prevSummary && <p className="mt-1.5 text-xs text-muted-foreground">Last time: {prevSummary}</p>}
          </div>

          {completedCount > 0 && (
            <div className="mb-3 space-y-1.5">
              {entry.sets.map((s, si) =>
                s.completed ? (
                  <button
                    key={s.id}
                    onClick={() => reopenSet(ci, si)}
                    className="flex w-full items-center gap-3 rounded-xl bg-success/10 px-3 py-2 text-left"
                  >
                    <span className="flex size-6 items-center justify-center rounded-full bg-success text-success-foreground">
                      <Check className="size-3.5" />
                    </span>
                    <span className="text-sm font-medium">Set {si + 1}</span>
                    <span className="ml-auto text-sm font-semibold tabular-nums">
                      {num(toDisplayWeight(s.weight, unit))} {unit} × {s.reps}
                      {s.rpe ? ` · RPE ${s.rpe}` : ''}
                    </span>
                    <Pencil className="size-3.5 text-muted-foreground" />
                  </button>
                ) : null,
              )}
            </div>
          )}

          {!complete ? (
            <>
              {cue && currentSetIndex > 0 && (
                <CueCard cue={cue} unit={unit} onPick={(kg) => patchSet(ci, currentSetIndex, { weight: kg })} />
              )}

              <div className="rounded-3xl border border-border/80 bg-card p-4">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    Set {currentSetIndex + 1}
                    {entry.target ? ` of ${entry.target.targetSets}` : ''}
                  </span>
                  {entry.sets.length > 1 && (
                    <button onClick={() => removeSet(ci, currentSetIndex)} className="text-xs text-muted-foreground">
                      Remove set
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Weight ({unit})
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => step(-1)}
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-xl font-bold tap-scale"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={entry.sets[currentSetIndex].weight ? num(toDisplayWeight(entry.sets[currentSetIndex].weight, unit)) : ''}
                        placeholder="0"
                        onChange={(e) =>
                          patchSet(ci, currentSetIndex, { weight: fromDisplayWeight(Number(e.target.value) || 0, unit) })
                        }
                        className="h-14 w-full min-w-0 rounded-xl border border-input bg-secondary/40 text-center text-2xl font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/50"
                      />
                      <button
                        onClick={() => step(1)}
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-xl font-bold tap-scale"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Reps
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={entry.sets[currentSetIndex].reps || ''}
                      placeholder={String(repsHigh)}
                      onChange={(e) => patchSet(ci, currentSetIndex, { reps: Number(e.target.value) || 0 })}
                      className="h-14 w-full rounded-xl border border-input bg-secondary/40 text-center text-2xl font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/50"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">RPE</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={entry.sets[currentSetIndex].rpe ?? ''}
                    placeholder="–"
                    onChange={(e) =>
                      patchSet(ci, currentSetIndex, { rpe: e.target.value ? Number(e.target.value) : undefined })
                    }
                    className="h-9 w-16 rounded-lg border border-input bg-secondary/40 text-center text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/50"
                  />
                  <span className="ml-auto text-xs text-muted-foreground">how hard? (6–10, optional)</span>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-success/30 bg-success/5 p-5 text-center">
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-success text-success-foreground">
                <Check className="size-6" />
              </div>
              <h3 className="text-lg font-bold">{exerciseName(entry.exerciseId)} done</h3>
              <p className="text-sm text-muted-foreground">
                {completedCount} set{completedCount > 1 ? 's' : ''} logged
                {topSet ? ` · top ${num(toDisplayWeight(topSet.weight, unit))} ${unit} × ${topSet.reps}` : ''}
              </p>
              {cue && cue.action === 'increase' && cue.options.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Next time, start around {num(toDisplayWeight(cue.primary, unit))} {unit}.
                </p>
              )}
              <div className="mt-4 flex flex-col gap-2">
                <Button variant="secondary" onClick={() => addSet(ci, entry.sets[entry.sets.length - 1]?.weight ?? 0)}>
                  <Plus className="size-4" /> Add another set
                </Button>
                {nextIdx != null && (
                  <Button variant="ghost" onClick={goNext}>
                    Skip rest → next exercise
                  </Button>
                )}
              </div>
            </div>
          )}

          {nextEntry && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3">
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Next exercise</p>
                <p className="truncate text-sm font-semibold">{exerciseName(nextEntry.exerciseId)}</p>
              </div>
              <span className="shrink-0 text-right text-xs text-muted-foreground">
                <span className="block">
                  {nextEntry.target
                    ? `${nextEntry.target.targetSets}×${nextEntry.target.repsLow}–${nextEntry.target.repsHigh}`
                    : `${nextEntry.sets.length} sets`}
                </span>
                {(() => {
                  const fi = nextEntry.sets.findIndex((s) => !s.completed)
                  const w = nextEntry.sets[fi >= 0 ? fi : 0]?.weight ?? 0
                  return w ? <span className="block font-medium text-foreground">{num(toDisplayWeight(w, unit))} {unit}</span> : null
                })()}
              </span>
            </div>
          )}
        </>
      )}

      {restPill}

      <ExercisePickerSheet open={pickerOpen} onOpenChange={setPickerOpen} onSelect={onPickExtra} />
    </FullScreenPage>
  )
}

function CueCard({ cue, unit, onPick }: { cue: NextSetCue; unit: 'lb' | 'kg'; onPick: (kg: number) => void }) {
  const Icon = cue.action === 'increase' ? TrendingUp : cue.action === 'decrease' ? TrendingDown : Minus
  const tone =
    cue.action === 'increase'
      ? 'border-success/40 bg-success/5'
      : cue.action === 'decrease'
        ? 'border-warning/40 bg-warning/5'
        : 'border-border bg-secondary/40'
  return (
    <div className={cn('mb-3 rounded-2xl border p-3', tone)}>
      <p className="flex items-start gap-2 text-sm font-medium">
        <Icon className="mt-0.5 size-4 shrink-0" />
        {cue.message}
      </p>
      {cue.options.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {cue.options.map((kg, i) => (
            <button
              key={i}
              onClick={() => onPick(kg)}
              className="rounded-full border border-border bg-background px-3 py-1 text-sm font-semibold tabular-nums tap-scale active:bg-secondary"
            >
              {num(toDisplayWeight(kg, unit))} {unit}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
