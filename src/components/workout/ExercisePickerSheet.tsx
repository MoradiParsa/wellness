import { useMemo, useState } from 'react'
import { Search, Plus, Dumbbell } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useExercises } from '@/hooks/useExercises'
import { MUSCLE_GROUPS, EQUIPMENT } from '@/lib/constants'
import type { ExerciseCategory } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (exerciseId: string) => void
}

export function ExercisePickerSheet({ open, onOpenChange, onSelect }: Props) {
  const { exercises, add } = useExercises()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState<string>(MUSCLE_GROUPS[0])
  const [equipment, setEquipment] = useState<string>(EQUIPMENT[0])
  const [category, setCategory] = useState<ExerciseCategory>('compound')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return exercises.filter(
      (e) => !q || e.name.toLowerCase().includes(q) || e.muscleGroup.toLowerCase().includes(q),
    )
  }, [exercises, query])

  const pick = (id: string) => {
    onSelect(id)
    onOpenChange(false)
    setQuery('')
    setCreating(false)
  }

  const createAndPick = () => {
    if (!name.trim()) return
    const ex = add({ name: name.trim(), muscleGroup: muscle, equipment, category })
    setName('')
    setCreating(false)
    pick(ex.id)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="h-[88dvh]">
        <SheetHeader>
          <SheetTitle>{creating ? 'New exercise' : 'Add exercise'}</SheetTitle>
        </SheetHeader>

        {creating ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Incline Smith Press" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Muscle group</Label>
              <Select value={muscle} onValueChange={setMuscle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MUSCLE_GROUPS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Equipment</Label>
              <Select value={equipment} onValueChange={setEquipment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ExerciseCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compound">Compound</SelectItem>
                  <SelectItem value="isolation">Isolation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={createAndPick} disabled={!name.trim()}>
                Add & select
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search exercises"
                className="pl-10"
              />
            </div>
            <Button variant="secondary" className="w-full" onClick={() => setCreating(true)}>
              <Plus className="size-4" /> Create custom exercise
            </Button>
            <div className="space-y-1">
              {filtered.map((e) => (
                <button
                  key={e.id}
                  onClick={() => pick(e.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left active:bg-secondary/60"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <Dumbbell className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{e.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {e.muscleGroup} · {e.equipment}
                    </span>
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No exercises found.</p>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
