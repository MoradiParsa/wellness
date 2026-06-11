import { useState, forwardRef, type InputHTMLAttributes } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Sparkles, Trash2 } from 'lucide-react'
import { FullScreenPage } from '@/components/layout/FullScreenPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import { useNutrition } from '@/hooks/useNutrition'
import { MEAL_TYPES } from '@/lib/constants'
import { todayKey } from '@/lib/date'
import { format } from 'date-fns'
import type { MealType } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Give this meal a name'),
  calories: z.coerce.number().min(0),
  protein: z.coerce.number().min(0),
  carbs: z.coerce.number().min(0),
  fat: z.coerce.number().min(0),
  fiber: z.coerce.number().min(0),
  time: z.string().optional(),
  notes: z.string().optional(),
})
type FormValues = z.input<typeof schema>

export function MealEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { getMeal, addMeal, saveMeal, removeMeal } = useNutrition()

  const existing = id ? getMeal(id) : undefined
  const date = existing?.date ?? params.get('date') ?? todayKey()

  const [photo, setPhoto] = useState<string | undefined>(existing?.photo)
  const [mealType, setMealType] = useState<MealType>(existing?.mealType ?? 'breakfast')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: existing?.name ?? '',
      calories: existing?.calories ?? 0,
      protein: existing?.protein ?? 0,
      carbs: existing?.carbs ?? 0,
      fat: existing?.fat ?? 0,
      fiber: existing?.fiber ?? 0,
      time: existing?.time ?? format(new Date(), 'HH:mm'),
      notes: existing?.notes ?? '',
    },
  })

  const onSubmit = (v: FormValues) => {
    const data = {
      date,
      name: String(v.name).trim(),
      calories: Number(v.calories),
      protein: Number(v.protein),
      carbs: Number(v.carbs),
      fat: Number(v.fat),
      fiber: Number(v.fiber),
      time: v.time || undefined,
      notes: v.notes?.trim() || undefined,
      photo,
      mealType,
    }
    if (existing) saveMeal({ ...existing, ...data })
    else addMeal(data)
    toast.success(existing ? 'Meal updated' : 'Meal logged')
    navigate(-1)
  }

  return (
    <FullScreenPage
      title={existing ? 'Edit meal' : 'Add meal'}
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
                <AlertDialogTitle>Delete this meal?</AlertDialogTitle>
                <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction
                  onClick={() => {
                    removeMeal(existing.id)
                    toast.success('Meal deleted')
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
          {existing ? 'Save changes' : 'Log meal'}
        </Button>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <PhotoPicker value={photo} onChange={setPhoto} />

        <div className="flex items-start gap-2.5 rounded-2xl border border-border/70 bg-secondary/40 p-3.5">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            AI food analysis coming soon. For now, enter nutrition manually.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Meal name</Label>
          <Input id="name" placeholder="e.g. Chicken & rice bowl" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Meal type</Label>
          <SegmentedControl
            layoutId="meal-type"
            size="sm"
            value={mealType}
            onChange={setMealType}
            options={MEAL_TYPES.map((m) => ({ value: m.value, label: m.label }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Calories (kcal)" {...register('calories')} />
          <NumberField label="Protein (g)" {...register('protein')} />
          <NumberField label="Carbs (g)" {...register('carbs')} />
          <NumberField label="Fat (g)" {...register('fat')} />
          <NumberField label="Fiber (g)" {...register('fiber')} />
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input id="time" type="time" {...register('time')} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" placeholder="Restaurant, recipe, how it felt…" {...register('notes')} />
        </div>
      </form>
    </FullScreenPage>
  )
}

const NumberField = forwardRef<HTMLInputElement, { label: string } & InputHTMLAttributes<HTMLInputElement>>(
  ({ label, ...props }, ref) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="number" inputMode="decimal" step="any" ref={ref} {...props} />
    </div>
  ),
)
NumberField.displayName = 'NumberField'
