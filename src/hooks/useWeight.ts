import { useCollection } from '@/data/store'
import { weightsStore } from '@/data/collections'
import { uid } from '@/lib/id'
import { nowISO } from '@/lib/date'
import type { WeightEntry } from '@/types'

export function useWeight() {
  const entries = useCollection(weightsStore)
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))

  return {
    entries: sorted,
    /** chronological (oldest first) — handy for charts & trends */
    chronological: [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    latest: sorted[0] ?? null,
    getById: (id: string) => weightsStore.getById(id),
    add: (data: Omit<WeightEntry, 'id' | 'createdAt'>) => {
      const e: WeightEntry = { ...data, id: uid(), createdAt: nowISO() }
      weightsStore.add(e)
      return e
    },
    save: (entry: WeightEntry) => weightsStore.upsert(entry),
    remove: (id: string) => weightsStore.remove(id),
  }
}
