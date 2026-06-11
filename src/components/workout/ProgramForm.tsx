import { useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ExercisePickerSheet } from './ExercisePickerSheet'
import { ProgramExerciseSheet } from './ProgramExerciseSheet'
import { useSettings } from '@/hooks/useSettings'
import { exerciseName } from '@/hooks/useExercises'
import { uid } from '@/lib/id'
import { formatWeight } from '@/lib/format'
import type { Program, ProgramDay, ProgramExercise } from '@/types'

interface Props {
  initial: Program
  onSave: (program: Program) => void
  submitLabel: string
}

interface ConfigTarget {
  dayId: string
  exerciseId: string
  index: number | null
  initial?: ProgramExercise
}

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr
  const copy = [...arr]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}

export function ProgramForm({ initial, onSave, submitLabel }: Props) {
  const { settings } = useSettings()
  const [program, setProgram] = useState<Program>(initial)
  const [pickerDayId, setPickerDayId] = useState<string | null>(null)
  const [config, setConfig] = useState<ConfigTarget | null>(null)

  const setDays = (days: ProgramDay[]) => setProgram((p) => ({ ...p, days }))

  const updateDay = (dayId: string, patch: Partial<ProgramDay>) =>
    setDays(program.days.map((d) => (d.id === dayId ? { ...d, ...patch } : d)))

  const addDay = () =>
    setDays([
      ...program.days,
      { id: uid(), name: `Day ${String.fromCharCode(65 + program.days.length)}`, order: program.days.length, exercises: [] },
    ])

  const removeDay = (dayId: string) => setDays(program.days.filter((d) => d.id !== dayId))

  const moveDay = (idx: number, dir: -1 | 1) => setDays(move(program.days, idx, idx + dir))

  const saveExercise = (pe: ProgramExercise) => {
    if (!config) return
    setDays(
      program.days.map((d) => {
        if (d.id !== config.dayId) return d
        const exercises = [...d.exercises]
        if (config.index == null) exercises.push(pe)
        else exercises[config.index] = pe
        return { ...d, exercises }
      }),
    )
  }

  const removeExercise = (dayId: string, index: number) =>
    setDays(
      program.days.map((d) =>
        d.id === dayId ? { ...d, exercises: d.exercises.filter((_, i) => i !== index) } : d,
      ),
    )

  const moveExercise = (dayId: string, index: number, dir: -1 | 1) =>
    setDays(
      program.days.map((d) =>
        d.id === dayId ? { ...d, exercises: move(d.exercises, index, index + dir) } : d,
      ),
    )

  const canSave =
    program.name.trim().length > 0 && program.days.some((d) => d.exercises.length > 0)

  const summary = (pe: ProgramExercise) => {
    const parts = [`${pe.targetSets}×${pe.repsLow === pe.repsHigh ? pe.repsLow : `${pe.repsLow}-${pe.repsHigh}`}`]
    if (pe.startingWeight > 0) parts.push(formatWeight(pe.startingWeight, settings))
    if (pe.targetRPE != null) parts.push(`RPE ${pe.targetRPE}`)
    else if (pe.targetRIR != null) parts.push(`${pe.targetRIR} RIR`)
    return parts.join(' · ')
  }

  return (
    <>
      <div className="space-y-5 pb-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Program name</label>
          <Input
            value={program.name}
            onChange={(e) => setProgram((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. PPL Hypertrophy"
          />
        </div>

        {program.days.map((day, dayIdx) => (
          <div key={day.id} className="rounded-3xl border border-border/80 bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <GripVertical className="size-4 shrink-0 text-muted-foreground/50" />
              <Input
                value={day.name}
                onChange={(e) => updateDay(day.id, { name: e.target.value })}
                className="h-10 flex-1 bg-secondary/40 font-semibold"
              />
              <div className="flex shrink-0 items-center">
                <button onClick={() => moveDay(dayIdx, -1)} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground active:bg-secondary disabled:opacity-30" disabled={dayIdx === 0}>
                  <ChevronUp className="size-4" />
                </button>
                <button onClick={() => moveDay(dayIdx, 1)} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground active:bg-secondary disabled:opacity-30" disabled={dayIdx === program.days.length - 1}>
                  <ChevronDown className="size-4" />
                </button>
                <button onClick={() => removeDay(day.id)} className="flex size-8 items-center justify-center rounded-lg text-destructive active:bg-secondary">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {day.exercises.map((pe, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl bg-secondary/40 px-3 py-2.5">
                  <button
                    onClick={() => setConfig({ dayId: day.id, exerciseId: pe.exerciseId, index: i, initial: pe })}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-[15px] font-medium">{exerciseName(pe.exerciseId)}</span>
                    <span className="block truncate text-xs text-muted-foreground">{summary(pe)}</span>
                  </button>
                  <button onClick={() => moveExercise(day.id, i, -1)} className="flex size-7 items-center justify-center rounded-md text-muted-foreground active:bg-secondary disabled:opacity-30" disabled={i === 0}>
                    <ChevronUp className="size-4" />
                  </button>
                  <button onClick={() => moveExercise(day.id, i, 1)} className="flex size-7 items-center justify-center rounded-md text-muted-foreground active:bg-secondary disabled:opacity-30" disabled={i === day.exercises.length - 1}>
                    <ChevronDown className="size-4" />
                  </button>
                  <button onClick={() => removeExercise(day.id, i)} className="flex size-7 items-center justify-center rounded-md text-destructive active:bg-secondary">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
              {day.exercises.length === 0 && (
                <p className="px-1 py-2 text-sm text-muted-foreground">No exercises yet.</p>
              )}
            </div>

            <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => setPickerDayId(day.id)}>
              <Plus className="size-4" /> Add exercise
            </Button>
          </div>
        ))}

        <Button variant="outline" className="w-full" onClick={addDay}>
          <Plus className="size-4" /> Add training day
        </Button>
      </div>

      <Button
        size="lg"
        className="w-full"
        disabled={!canSave}
        onClick={() => onSave({ ...program, name: program.name.trim() })}
      >
        {submitLabel}
      </Button>

      <ExercisePickerSheet
        open={pickerDayId != null}
        onOpenChange={(o) => !o && setPickerDayId(null)}
        onSelect={(exerciseId) => {
          if (pickerDayId) setConfig({ dayId: pickerDayId, exerciseId, index: null })
          setPickerDayId(null)
        }}
      />

      {config && (
        <ProgramExerciseSheet
          open
          onOpenChange={(o) => !o && setConfig(null)}
          exerciseId={config.exerciseId}
          initial={config.initial}
          onSave={saveExercise}
        />
      )}
    </>
  )
}
