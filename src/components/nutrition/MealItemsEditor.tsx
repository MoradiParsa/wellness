import { Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { sumItems } from '@/services/nutrition'
import type { MealItem, FoodSource } from '@/types'

const sourceLabel: Record<FoodSource, string> = {
  local: 'Database',
  usda: 'USDA',
  openfoodfacts: 'OpenFoodFacts',
  ai: 'AI',
  manual: 'Manual',
}

export function blankFoodItem(): MealItem {
  return { name: '', quantity: 1, unit: 'serving', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, source: 'manual' }
}

function MacroInput({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <label className="mb-1 block text-center text-[10px] font-medium uppercase text-muted-foreground">{label}</label>
      <Input value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} inputMode="numeric" className="h-9 px-1 text-center text-sm" />
    </div>
  )
}

export function MealItemRow({
  item,
  onPatch,
  onRemove,
}: {
  item: MealItem
  onPatch: (p: Partial<MealItem>) => void
  onRemove: () => void
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-3">
      <div className="mb-2 flex items-center gap-2">
        <Input value={item.name} onChange={(e) => onPatch({ name: e.target.value })} placeholder="Food name" className="h-10 flex-1" />
        <button onClick={onRemove} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground active:bg-secondary" aria-label="Remove food">
          <X className="size-4" />
        </button>
      </div>
      <div className="mb-2 flex items-center gap-2">
        <Input value={item.quantity} onChange={(e) => onPatch({ quantity: Number(e.target.value) || 0 })} inputMode="decimal" className="h-9 w-16 text-center" />
        <Input value={item.unit} onChange={(e) => onPatch({ unit: e.target.value })} className="h-9 w-20 text-center" />
        <Badge variant="outline" className="ml-auto">
          {sourceLabel[item.source]}
          {item.confidence != null ? ` · ${Math.round(item.confidence * 100)}%` : ''}
        </Badge>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <MacroInput label="kcal" value={item.calories} onChange={(n) => onPatch({ calories: n })} />
        <MacroInput label="P" value={item.protein} onChange={(n) => onPatch({ protein: n })} />
        <MacroInput label="C" value={item.carbs} onChange={(n) => onPatch({ carbs: n })} />
        <MacroInput label="F" value={item.fat} onChange={(n) => onPatch({ fat: n })} />
      </div>
    </div>
  )
}

export function MealItemsEditor({
  items,
  onChange,
  label = 'Foods',
}: {
  items: MealItem[]
  onChange: (items: MealItem[]) => void
  label?: string
}) {
  const patch = (i: number, p: Partial<MealItem>) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...p } : it)))
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const add = () => onChange([...items, blankFoodItem()])
  const totals = sumItems(items)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <button onClick={add} className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
          <Plus className="size-4" /> Add
        </button>
      </div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <MealItemRow key={i} item={it} onPatch={(p) => patch(i, p)} onRemove={() => remove(i)} />
        ))}
      </div>
      {items.length > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/30 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-semibold tabular-nums">
            {totals.calories} kcal · {totals.protein}P {totals.carbs}C {totals.fat}F
          </span>
        </div>
      )}
    </div>
  )
}
