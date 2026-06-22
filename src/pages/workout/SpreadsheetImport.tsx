import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Trash2, CheckSquare, Square, Columns3, AlertTriangle, Table2 } from 'lucide-react'
import { FullScreenPage } from '@/components/layout/FullScreenPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/sonner'
import { usePrograms } from '@/hooks/usePrograms'
import { useExercises } from '@/hooks/useExercises'
import { useSettings } from '@/hooks/useSettings'
import { fromDisplayWeight } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  IMPORT_FIELDS,
  detectMapping,
  emptyMapping,
  parseCsv,
  toStringMatrix,
  splitHeader,
  buildDraftDays,
  parseReps,
  parseRest,
  parseRpe,
  parseWeight,
  parseIntSafe,
  normalizeExerciseName,
  type Mapping,
  type DraftDay,
  type DraftExercise,
} from '@/lib/workoutImport'
import type { ProgramDay, ProgramExercise } from '@/types'

type Step = 'upload' | 'mapping' | 'review'

function baseName(file: string): string {
  return file.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
}

export function SpreadsheetImport() {
  const navigate = useNavigate()
  const { create } = usePrograms()
  const { exercises, add: addExercise } = useExercises()
  const { settings } = useSettings()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [busy, setBusy] = useState(false)
  const [headers, setHeaders] = useState<string[]>([])
  const [data, setData] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Mapping>(emptyMapping())
  const [days, setDays] = useState<DraftDay[]>([])
  const [programName, setProgramName] = useState('')

  const unit = settings.units.weight

  // ---- File reading -------------------------------------------------------

  async function readFile(file: File): Promise<string[][]> {
    const lower = file.name.toLowerCase()
    if (lower.endsWith('.csv') || file.type === 'text/csv') {
      return parseCsv(await file.text())
    }
    if (lower.endsWith('.xls')) {
      throw new Error('Legacy .xls files aren’t supported — re-save as .xlsx or export as CSV.')
    }
    // Reads the first sheet into a row matrix (main thread, no Web Worker).
    const { readSheet } = await import('read-excel-file/browser')
    const rows = (await readSheet(file)) as unknown[][]
    return toStringMatrix(rows)
  }

  async function handleFile(file: File) {
    setBusy(true)
    try {
      const raw = await readFile(file)
      const { headers: h, data: d } = splitHeader(raw)
      if (h.length === 0 || d.length === 0) {
        toast.error('No rows found in that file.')
        return
      }
      const detected = detectMapping(h)
      setHeaders(h)
      setData(d)
      setMapping(detected)
      setProgramName(baseName(file.name) || 'Imported Program')
      if (detected.exercise >= 0) {
        setDays(buildDraftDays(d, detected))
        setStep('review')
      } else {
        // Couldn't find the exercise column — let the user map columns by hand.
        setStep('mapping')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not read that file.')
    } finally {
      setBusy(false)
    }
  }

  function applyMapping() {
    if (mapping.exercise < 0) {
      toast.error('Choose which column holds the exercise name.')
      return
    }
    setDays(buildDraftDays(data, mapping))
    setStep('review')
  }

  // ---- Draft editing ------------------------------------------------------

  const updateDay = (dayId: string, patch: Partial<DraftDay>) =>
    setDays((ds) => ds.map((d) => (d.id === dayId ? { ...d, ...patch } : d)))

  const updateExercise = (dayId: string, exId: string, patch: Partial<DraftExercise>) =>
    setDays((ds) =>
      ds.map((d) =>
        d.id === dayId
          ? { ...d, exercises: d.exercises.map((e) => (e.id === exId ? { ...e, ...patch } : e)) }
          : d,
      ),
    )

  const removeExercise = (dayId: string, exId: string) =>
    setDays((ds) =>
      ds.map((d) =>
        d.id === dayId ? { ...d, exercises: d.exercises.filter((e) => e.id !== exId) } : d,
      ),
    )

  const removeDay = (dayId: string) => setDays((ds) => ds.filter((d) => d.id !== dayId))

  // ---- Commit -------------------------------------------------------------

  const includedCount = days
    .filter((d) => d.include)
    .reduce((n, d) => n + d.exercises.filter((e) => e.include && e.exercise.trim()).length, 0)

  function resolveExerciseId(name: string, muscle: string, cache: Map<string, string>): string {
    const key = normalizeExerciseName(name)
    const cached = cache.get(key)
    if (cached) return cached
    const existing = exercises.find((e) => normalizeExerciseName(e.name) === key)
    if (existing) {
      cache.set(key, existing.id)
      return existing.id
    }
    const created = addExercise({
      name: name.trim(),
      muscleGroup: muscle.trim() || 'Other',
      equipment: 'Other',
      category: 'compound',
    })
    cache.set(key, created.id)
    return created.id
  }

  function buildProgramExercise(e: DraftExercise, cache: Map<string, string>): ProgramExercise {
    const reps = parseReps(e.reps)
    const sets = parseIntSafe(e.sets) ?? 3
    const w = parseWeight(e.weight)
    const rpe = parseRpe(e.rpe)
    const rest = parseRest(e.rest)
    return {
      exerciseId: resolveExerciseId(e.exercise, e.muscleGroup, cache),
      targetSets: sets > 0 ? sets : 3,
      repsLow: reps.low || 8,
      repsHigh: reps.high || reps.low || 12,
      startingWeight: w != null ? Math.max(0, fromDisplayWeight(w, unit)) : 0,
      targetRPE: rpe ?? undefined,
      restSec: rest ?? 90,
      notes: e.notes.trim() || undefined,
    }
  }

  function commit() {
    const cache = new Map<string, string>()
    const builtDays: ProgramDay[] = []
    let order = 0
    for (const d of days) {
      if (!d.include) continue
      const rows = d.exercises.filter((e) => e.include && e.exercise.trim())
      if (rows.length === 0) continue
      builtDays.push({
        id: crypto.randomUUID(),
        name: d.name.trim() || `Day ${order + 1}`,
        order,
        exercises: rows.map((e) => buildProgramExercise(e, cache)),
      })
      order++
    }
    if (builtDays.length === 0) {
      toast.error('Select at least one day with one exercise.')
      return
    }
    create({ name: programName.trim() || 'Imported Program', days: builtDays }, true)
    toast.success('Workout plan committed')
    navigate('/workout', { replace: true })
  }

  // ---- Render -------------------------------------------------------------

  if (step === 'upload') {
    return (
      <FullScreenPage title="Import Workout Plan" noSwipe>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) handleFile(f)
          }}
        />

        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex w-full flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-border bg-card px-6 py-10 text-center active:bg-secondary/40 disabled:opacity-60"
        >
          <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary">
            <Upload className="size-7" />
          </span>
          <span className="text-base font-semibold">{busy ? 'Reading file…' : 'Choose a file'}</span>
          <span className="text-sm text-muted-foreground">CSV, Excel (.xlsx), or Google Sheets export</span>
        </button>

        <div className="mt-5 rounded-2xl border border-border/80 bg-card p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Table2 className="size-4 text-muted-foreground" /> What to include
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            One row per exercise. The importer auto-detects columns like{' '}
            <span className="text-foreground">Day, Exercise, Muscle Group, Sets, Reps, Weight, RPE, Rest,
            Notes</span>{' '}
            — in any order. If a column can’t be matched, you’ll get a quick mapping screen. Nothing is saved
            until you commit.
          </p>
        </div>

        <p className="mt-4 px-1 text-xs text-muted-foreground">
          Tip: in Google Sheets use File → Download → CSV (or Excel .xlsx).
        </p>
      </FullScreenPage>
    )
  }

  if (step === 'mapping') {
    const options = headers.map((h, i) => ({ value: String(i), label: h.trim() || `Column ${i + 1}` }))
    const sampleFor = (idx: number) => {
      if (idx < 0) return ''
      const row = data.find((r) => (r[idx] ?? '').trim() !== '')
      return row ? row[idx] : ''
    }
    return (
      <FullScreenPage
        title="Match columns"
        noSwipe
        footer={
          <Button size="lg" className="w-full" onClick={applyMapping}>
            Continue to review
          </Button>
        }
      >
        <div className="mb-4 flex gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-4">
          <Columns3 className="size-5 shrink-0 text-warning" />
          <p className="text-sm text-muted-foreground">
            We couldn’t auto-detect every column. Pick which spreadsheet column matches each field. Only{' '}
            <span className="text-foreground">Exercise</span> is required.
          </p>
        </div>

        <div className="space-y-3">
          {IMPORT_FIELDS.map((field) => {
            const idx = mapping[field.key]
            const sample = sampleFor(idx)
            return (
              <div key={field.key} className="rounded-2xl border border-border/80 bg-card p-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="ml-1 text-destructive">*</span>}
                  </label>
                  <select
                    value={String(idx)}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, [field.key]: Number(e.target.value) }) as Mapping)
                    }
                    className="h-10 max-w-[55%] rounded-xl border border-input bg-secondary/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                  >
                    <option value="-1">— Not in file —</option>
                    {options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {sample && (
                  <p className="mt-1.5 truncate text-xs text-muted-foreground">e.g. “{sample}”</p>
                )}
              </div>
            )
          })}
        </div>
      </FullScreenPage>
    )
  }

  // step === 'review'
  return (
    <FullScreenPage
      title="Review plan"
      noSwipe
      right={
        <Button size="iconSm" variant="secondary" onClick={() => setStep('mapping')} title="Adjust columns">
          <Columns3 />
        </Button>
      }
      footer={
        <Button size="lg" className="w-full" disabled={includedCount === 0} onClick={commit}>
          Commit Workout Plan{includedCount > 0 ? ` · ${includedCount} exercises` : ''}
        </Button>
      }
    >
      <div className="mb-4 space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Program name</label>
        <Input value={programName} onChange={(e) => setProgramName(e.target.value)} placeholder="My Program" />
      </div>

      {days.length === 0 ? (
        <div className="rounded-2xl border border-border/80 bg-card p-5 text-center">
          <AlertTriangle className="mx-auto mb-2 size-6 text-warning" />
          <p className="text-sm text-muted-foreground">
            No exercises were read. Try the column mapping to point at the right columns.
          </p>
          <Button variant="secondary" className="mt-3" onClick={() => setStep('mapping')}>
            <Columns3 className="size-4" /> Match columns
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {days.map((day) => (
            <div
              key={day.id}
              className={cn(
                'rounded-3xl border border-border/80 bg-card p-3.5',
                !day.include && 'opacity-60',
              )}
            >
              <div className="mb-2.5 flex items-center gap-2">
                <Toggle on={day.include} onClick={() => updateDay(day.id, { include: !day.include })} />
                <Input
                  value={day.name}
                  onChange={(e) => updateDay(day.id, { name: e.target.value })}
                  className="h-10 flex-1 bg-secondary/40 font-semibold"
                />
                <span className="shrink-0 px-1 text-xs text-muted-foreground">
                  {day.exercises.filter((e) => e.include && e.exercise.trim()).length}
                </span>
                <button
                  onClick={() => removeDay(day.id)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-destructive active:bg-secondary"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <div className="space-y-2">
                {day.exercises.map((ex) => (
                  <div
                    key={ex.id}
                    className={cn('rounded-2xl bg-secondary/40 p-3', !ex.include && 'opacity-50')}
                  >
                    <div className="flex items-center gap-2">
                      <Toggle
                        on={ex.include}
                        onClick={() => updateExercise(day.id, ex.id, { include: !ex.include })}
                      />
                      <input
                        value={ex.exercise}
                        onChange={(e) => updateExercise(day.id, ex.id, { exercise: e.target.value })}
                        placeholder="Exercise name"
                        className={cn(
                          'h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-ring/50',
                          ex.exercise.trim() ? 'border-border/70' : 'border-warning/60',
                        )}
                      />
                      <button
                        onClick={() => removeExercise(day.id, ex.id)}
                        className="flex size-8 shrink-0 items-center justify-center rounded-md text-destructive active:bg-secondary"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>

                    <div className="mt-2 grid grid-cols-4 gap-2">
                      <Mini label="Sets" value={ex.sets} onChange={(v) => updateExercise(day.id, ex.id, { sets: v })} />
                      <Mini label="Reps" value={ex.reps} onChange={(v) => updateExercise(day.id, ex.id, { reps: v })} />
                      <Mini label={unit} value={ex.weight} onChange={(v) => updateExercise(day.id, ex.id, { weight: v })} />
                      <Mini label="RPE" value={ex.rpe} onChange={(v) => updateExercise(day.id, ex.id, { rpe: v })} />
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      <Mini label="Rest" value={ex.rest} onChange={(v) => updateExercise(day.id, ex.id, { rest: v })} />
                      <div className="col-span-3">
                        <Mini label="Notes" value={ex.notes} onChange={(v) => updateExercise(day.id, ex.id, { notes: v })} />
                      </div>
                    </div>
                  </div>
                ))}
                {day.exercises.length === 0 && (
                  <p className="px-1 py-1 text-sm text-muted-foreground">No exercises in this day.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </FullScreenPage>
  )
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex size-9 shrink-0 items-center justify-center rounded-lg active:bg-secondary">
      {on ? (
        <CheckSquare className="size-5 text-primary" />
      ) : (
        <Square className="size-5 text-muted-foreground/50" />
      )}
    </button>
  )
}

function Mini({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="px-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-border/70 bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
      />
    </label>
  )
}
