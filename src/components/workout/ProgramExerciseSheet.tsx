import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { NumberStepper } from '@/components/shared/NumberStepper'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { useSettings } from '@/hooks/useSettings'
import { exerciseName } from '@/hooks/useExercises'
import { toDisplayWeight, fromDisplayWeight, liftStep } from '@/lib/format'
import type { ProgramExercise } from '@/types'

type EffortMethod = 'rpe' | 'rir' | 'none'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  exerciseId: string
  initial?: ProgramExercise
  onSave: (pe: ProgramExercise) => void
}

export function ProgramExerciseSheet({ open, onOpenChange, exerciseId, initial, onSave }: Props) {
  const { settings } = useSettings()
  const unit = settings.units.weight
  const step = liftStep(settings)

  const [sets, setSets] = useState(3)
  const [repsLow, setRepsLow] = useState(8)
  const [repsHigh, setRepsHigh] = useState(10)
  const [weight, setWeight] = useState(0)
  const [restSec, setRestSec] = useState(120)
  const [effort, setEffort] = useState<EffortMethod>('rpe')
  const [rpe, setRpe] = useState(8)
  const [rir, setRir] = useState(2)
  const [tempo, setTempo] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    setSets(initial?.targetSets ?? 3)
    setRepsLow(initial?.repsLow ?? 8)
    setRepsHigh(initial?.repsHigh ?? 10)
    setWeight(initial ? Number(toDisplayWeight(initial.startingWeight, unit).toFixed(1)) : 0)
    setRestSec(initial?.restSec ?? 120)
    setTempo(initial?.tempo ?? '')
    setNotes(initial?.notes ?? '')
    if (initial?.targetRPE != null) {
      setEffort('rpe')
      setRpe(initial.targetRPE)
    } else if (initial?.targetRIR != null) {
      setEffort('rir')
      setRir(initial.targetRIR)
    } else {
      setEffort(initial ? 'none' : 'rpe')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const save = () => {
    onSave({
      exerciseId,
      targetSets: sets,
      repsLow: Math.min(repsLow, repsHigh),
      repsHigh: Math.max(repsLow, repsHigh),
      startingWeight: fromDisplayWeight(weight, unit),
      restSec,
      targetRPE: effort === 'rpe' ? rpe : undefined,
      targetRIR: effort === 'rir' ? rir : undefined,
      tempo: tempo.trim() || undefined,
      notes: notes.trim() || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-h-[92dvh]">
        <SheetHeader>
          <SheetTitle>{exerciseName(exerciseId)}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          <Row label="Sets">
            <NumberStepper value={sets} onChange={setSets} min={1} max={12} className="w-44" />
          </Row>

          <div className="space-y-2">
            <Label>Rep range</Label>
            <div className="flex items-center gap-3">
              <NumberStepper value={repsLow} onChange={setRepsLow} min={1} max={50} />
              <span className="text-muted-foreground">to</span>
              <NumberStepper value={repsHigh} onChange={setRepsHigh} min={1} max={50} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Starting weight</Label>
            <NumberStepper value={weight} onChange={setWeight} step={step} min={0} precision={1} suffix={unit} />
          </div>

          <div className="space-y-2">
            <Label>Rest between sets</Label>
            <NumberStepper value={restSec} onChange={setRestSec} step={15} min={0} max={600} suffix="sec" />
          </div>

          <div className="space-y-2">
            <Label>Target effort</Label>
            <SegmentedControl
              layoutId="effort-method"
              value={effort}
              onChange={setEffort}
              options={[
                { value: 'rpe', label: 'RPE' },
                { value: 'rir', label: 'RIR' },
                { value: 'none', label: 'None' },
              ]}
            />
            {effort === 'rpe' && (
              <div className="flex items-center gap-4 pt-2">
                <Slider value={[rpe]} min={6} max={10} step={0.5} onValueChange={([v]) => setRpe(v)} />
                <span className="w-12 shrink-0 text-right text-lg font-semibold tabular-nums">{rpe}</span>
              </div>
            )}
            {effort === 'rir' && (
              <div className="pt-2">
                <NumberStepper value={rir} onChange={setRir} min={0} max={6} suffix="reps left" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tempo (optional)</Label>
            <Input value={tempo} onChange={(e) => setTempo(e.target.value)} placeholder="e.g. 3-0-1 (eccentric-pause-concentric)" />
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Cues, setup, machine settings…" />
          </div>

          <Button size="lg" className="w-full" onClick={save}>
            Save exercise
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="shrink-0">{label}</Label>
      {children}
    </div>
  )
}
