import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Dumbbell, ChevronRight } from 'lucide-react'
import { FullScreenPage } from '@/components/layout/FullScreenPage'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExercisePickerSheet } from '@/components/workout/ExercisePickerSheet'
import { useExercises } from '@/hooks/useExercises'

export function ExerciseLibrary() {
  const navigate = useNavigate()
  const { exercises } = useExercises()
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = exercises.filter(
      (e) => !q || e.name.toLowerCase().includes(q) || e.muscleGroup.toLowerCase().includes(q),
    )
    const map = new Map<string, typeof filtered>()
    for (const e of filtered) {
      const arr = map.get(e.muscleGroup) ?? []
      arr.push(e)
      map.set(e.muscleGroup, arr)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [exercises, query])

  return (
    <FullScreenPage
      title="Exercises"
      right={
        <Button size="iconSm" variant="secondary" onClick={() => setAdding(true)}>
          <Plus />
        </Button>
      }
    >
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search exercises" className="pl-10" />
      </div>

      {groups.map(([muscle, list]) => (
        <div key={muscle} className="mb-5">
          <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {muscle}
          </p>
          <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card">
            {list.map((e) => (
              <button
                key={e.id}
                onClick={() => navigate(`/workout/exercise/${e.id}`)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-secondary/60"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <Dumbbell className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{e.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{e.equipment}</span>
                </span>
                {e.isCustom && <Badge variant="outline">Custom</Badge>}
                <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" />
              </button>
            ))}
          </div>
        </div>
      ))}

      <ExercisePickerSheet open={adding} onOpenChange={setAdding} onSelect={(id) => navigate(`/workout/exercise/${id}`)} />
    </FullScreenPage>
  )
}
