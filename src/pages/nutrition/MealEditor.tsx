import { useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { FullScreenPage } from '@/components/layout/FullScreenPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { PhotoPicker } from '@/components/shared/PhotoPicker'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { MealItemsEditor } from '@/components/nutrition/MealItemsEditor'
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
import { sumItems } from '@/services/nutrition'
import { MEAL_TYPES } from '@/lib/constants'
import { todayKey } from '@/lib/date'
import type { MealItem, MealType } from '@/types'

export function MealEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { getMeal, addMeal, saveMeal, removeMeal } = useNutrition()

  const existing = id ? getMeal(id) : undefined
  const date = existing?.date ?? params.get('date') ?? todayKey()
  const itemized = existing?.items != null

  const [name, setName] = useState(existing?.name ?? '')
  const [mealType, setMealType] = useState<MealType>(existing?.mealType ?? 'breakfast')
  const [time, setTime] = useState(existing?.time ?? format(new Date(), 'HH:mm'))
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [photo, setPhoto] = useState<string | undefined>(existing?.photo)
  const [items, setItems] = useState<MealItem[]>(existing?.items ?? [])

  // Manual macros (used when the meal isn't itemized)
  const [calories, setCalories] = useState(existing?.calories ?? 0)
  const [protein, setProtein] = useState(existing?.protein ?? 0)
  const [carbs, setCarbs] = useState(existing?.carbs ?? 0)
  const [fat, setFat] = useState(existing?.fat ?? 0)
  const [fiber, setFiber] = useState(existing?.fiber ?? 0)

  const totals = itemized
    ? sumItems(items)
    : { calories, protein, carbs, fat, fiber }

  const onSave = () => {
    if (!name.trim()) {
      toast.error('Give this meal a name.')
      return
    }
    const data = {
      date,
      name: name.trim(),
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
      fiber: totals.fiber,
      time: time || undefined,
      notes: notes.trim() || undefined,
      photo,
      mealType,
      items: itemized ? items : undefined,
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
        <Button size="lg" className="w-full" onClick={onSave}>
          {existing ? 'Save changes' : 'Log meal'}
        </Button>
      }
    >
      <div className="space-y-5">
        <PhotoPicker value={photo} onChange={setPhoto} />

        <div className="space-y-2">
          <Label htmlFor="name">Meal name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chicken & rice bowl" />
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

        {itemized ? (
          <MealItemsEditor items={items} onChange={setItems} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Calories (kcal)" value={calories} onChange={setCalories} />
            <Field label="Protein (g)" value={protein} onChange={setProtein} />
            <Field label="Carbs (g)" value={carbs} onChange={setCarbs} />
            <Field label="Fat (g)" value={fat} onChange={setFat} />
            <Field label="Fiber (g)" value={fiber} onChange={setFiber} />
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
        )}

        {itemized && (
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Restaurant, recipe, how it felt…" />
        </div>
      </div>
    </FullScreenPage>
  )
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        step="any"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  )
}
