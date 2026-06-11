import { useCollection } from '@/data/store'
import { mealsStore, waterStore } from '@/data/collections'
import { uid } from '@/lib/id'
import { nowISO, todayKey } from '@/lib/date'
import type { Meal } from '@/types'

export interface DayTotals {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

export function sumMeals(meals: Meal[]): DayTotals {
  return meals.reduce<DayTotals>(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein: acc.protein + (m.protein || 0),
      carbs: acc.carbs + (m.carbs || 0),
      fat: acc.fat + (m.fat || 0),
      fiber: acc.fiber + (m.fiber || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  )
}

export function useNutrition(date: string = todayKey()) {
  const allMeals = useCollection(mealsStore)
  const allWater = useCollection(waterStore)

  const meals = allMeals
    .filter((m) => m.date === date)
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '') || a.createdAt.localeCompare(b.createdAt))
  const totals = sumMeals(meals)
  const waterRow = allWater.find((w) => w.date === date)
  const water = waterRow?.amount ?? 0

  const setWater = (amount: number) => {
    const next = Math.max(0, amount)
    const existing = allWater.find((w) => w.date === date)
    if (existing) waterStore.update(existing.id, { amount: next })
    else waterStore.add({ id: uid(), date, amount: next })
  }

  return {
    meals,
    allMeals,
    totals,
    water,
    addWater: (delta: number) => setWater(water + delta),
    setWater,
    addMeal: (data: Omit<Meal, 'id' | 'createdAt'>) => {
      const meal: Meal = { ...data, id: uid(), createdAt: nowISO() }
      mealsStore.add(meal)
      return meal
    },
    saveMeal: (meal: Meal) => mealsStore.upsert(meal),
    removeMeal: (id: string) => mealsStore.remove(id),
    getMeal: (id: string) => mealsStore.getById(id),
  }
}
