import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useParams, useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { FullScreenPage } from '@/components/layout/FullScreenPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { PhotoPicker } from '@/components/shared/PhotoPicker'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
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
import { useWeight } from '@/hooks/useWeight'
import { useSettings } from '@/hooks/useSettings'
import { todayKey } from '@/lib/date'
import { toDisplayWeight, fromDisplayWeight } from '@/lib/format'
import type { TimeOfDay } from '@/types'

const schema = z.object({
  date: z.string().min(1),
  weight: z.coerce.number().positive('Enter your weight'),
  bodyFat: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
  muscle: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
  water: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
  notes: z.string().optional(),
})
type FormValues = z.input<typeof schema>

const numOrUndef = (v: unknown) => (v === '' || v == null ? undefined : Number(v))

export function WeightEntryForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getById, add, save, remove } = useWeight()
  const { settings } = useSettings()
  const unit = settings.units.weight

  const existing = id ? getById(id) : undefined
  const [photo, setPhoto] = useState<string | undefined>(existing?.photo)
  const [fasted, setFasted] = useState(existing?.fasted ?? true)
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(existing?.timeOfDay ?? 'morning')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: existing?.date ?? todayKey(),
      weight: existing ? Number(toDisplayWeight(existing.weight, unit).toFixed(1)) : ('' as unknown as number),
      bodyFat: existing?.bodyFat ?? '',
      muscle: existing?.muscle ?? '',
      water: existing?.water ?? '',
      notes: existing?.notes ?? '',
    },
  })

  const onSubmit = (v: FormValues) => {
    const data = {
      date: String(v.date),
      weight: fromDisplayWeight(Number(v.weight), unit),
      bodyFat: numOrUndef(v.bodyFat),
      muscle: numOrUndef(v.muscle),
      water: numOrUndef(v.water),
      fasted,
      timeOfDay,
      notes: v.notes?.trim() || undefined,
      photo,
    }
    if (existing) save({ ...existing, ...data })
    else add(data)
    toast.success(existing ? 'Weigh-in updated' : 'Weight logged')
    navigate(-1)
  }

  return (
    <FullScreenPage
      title={existing ? 'Edit weigh-in' : 'Log weight'}
      noSwipe
      right={
        existing ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="iconSm" variant="ghost">
                <Trash2 className="text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this weigh-in?</AlertDialogTitle>
                <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction
                  onClick={() => {
                    remove(existing.id)
                    toast.success('Weigh-in deleted')
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
      footer={
        <Button size="lg" className="w-full" onClick={handleSubmit(onSubmit)}>
          {existing ? 'Save changes' : 'Save weigh-in'}
        </Button>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="weight">Weight ({unit})</Label>
            <Input id="weight" type="number" inputMode="decimal" step="any" autoFocus {...register('weight')} />
            {errors.weight && <p className="text-xs text-destructive">{errors.weight.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" {...register('date')} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Body fat %</Label>
            <Input type="number" inputMode="decimal" step="any" placeholder="—" {...register('bodyFat')} />
          </div>
          <div className="space-y-2">
            <Label>Muscle %</Label>
            <Input type="number" inputMode="decimal" step="any" placeholder="—" {...register('muscle')} />
          </div>
          <div className="space-y-2">
            <Label>Water %</Label>
            <Input type="number" inputMode="decimal" step="any" placeholder="—" {...register('water')} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Time of day</Label>
          <SegmentedControl
            layoutId="time-of-day"
            value={timeOfDay}
            onChange={setTimeOfDay}
            options={[
              { value: 'morning', label: 'Morning' },
              { value: 'evening', label: 'Evening' },
            ]}
          />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-card px-4 py-3.5">
          <div>
            <p className="text-[15px] font-medium">Fasted</p>
            <p className="text-xs text-muted-foreground">Measured before eating/drinking</p>
          </div>
          <Switch checked={fasted} onCheckedChange={setFasted} />
        </div>

        <div className="space-y-2">
          <Label>Progress photo</Label>
          <PhotoPicker value={photo} onChange={setPhoto} aspect="square" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" placeholder="How you look / feel, conditions…" {...register('notes')} />
        </div>
      </form>
    </FullScreenPage>
  )
}
