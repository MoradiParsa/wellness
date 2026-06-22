import { useCollection } from '@/data/store'
import { mealsStore } from '@/data/collections'
import type { MealItem } from '@/types'

/** Distinct recently-logged foods (newest first) for one-tap re-adding. */
export function useRecentFoods(limit = 12): MealItem[] {
  const meals = useCollection(mealsStore)
  const sorted = [...meals].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const seen = new Set<string>()
  const out: MealItem[] = []
  for (const m of sorted) {
    for (const it of m.items ?? []) {
      const key = it.name.trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(it)
      if (out.length >= limit) return out
    }
  }
  return out
}
