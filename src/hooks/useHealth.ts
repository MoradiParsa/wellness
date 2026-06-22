import { useCollection } from '@/data/store'
import { healthStore } from '@/data/collections'
import type { HealthEntry } from '@/types'

type HealthFields = Omit<HealthEntry, 'id' | 'date'>

/** Manual daily health log (one row per date; id = date key). */
export function useHealth() {
  const entries = useCollection(healthStore)
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))

  return {
    entries: sorted,
    getByDate: (date: string) => healthStore.getById(date),
    save: (date: string, patch: Partial<HealthFields>) => {
      const existing = healthStore.getById(date)
      if (existing) healthStore.upsert({ ...existing, ...patch })
      else healthStore.add({ id: date, date, ...patch })
    },
    remove: (date: string) => healthStore.remove(date),
  }
}
