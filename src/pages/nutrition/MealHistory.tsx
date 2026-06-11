import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { UtensilsCrossed } from 'lucide-react'
import { FullScreenPage } from '@/components/layout/FullScreenPage'
import { EmptyState } from '@/components/shared/EmptyState'
import { useNutrition } from '@/hooks/useNutrition'
import { sumMeals } from '@/hooks/useNutrition'
import { formatPretty } from '@/lib/date'
import { formatGrams } from '@/lib/format'
import type { Meal } from '@/types'

export function MealHistory() {
  const navigate = useNavigate()
  const { allMeals } = useNutrition()

  const byDate = useMemo(() => {
    const map = new Map<string, Meal[]>()
    for (const m of allMeals) {
      const arr = map.get(m.date) ?? []
      arr.push(m)
      map.set(m.date, arr)
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, meals]) => ({
        date,
        meals: meals.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')),
      }))
  }, [allMeals])

  if (allMeals.length === 0) {
    return (
      <FullScreenPage title="Meal history">
        <EmptyState icon={UtensilsCrossed} title="No meals yet" description="Logged meals appear here, grouped by day." />
      </FullScreenPage>
    )
  }

  return (
    <FullScreenPage title="Meal history">
      <div className="space-y-6">
        {byDate.map(({ date, meals }) => {
          const totals = sumMeals(meals)
          return (
            <div key={date}>
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-sm font-semibold">{formatPretty(date)}</span>
                <span className="text-xs text-muted-foreground">{Math.round(totals.calories)} kcal</span>
              </div>
              <div className="space-y-2">
                {meals.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => navigate(`/nutrition/meal/${m.id}`)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 text-left active:bg-secondary/50"
                  >
                    {m.photo ? (
                      <img src={m.photo} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary">
                        <UtensilsCrossed className="size-4 text-muted-foreground" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{m.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {Math.round(m.calories)} kcal · {formatGrams(m.protein)}P · {formatGrams(m.carbs)}C · {formatGrams(m.fat)}F
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </FullScreenPage>
  )
}
