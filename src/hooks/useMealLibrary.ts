import { useCollection } from '@/data/store'
import { savedFoodsStore, savedMealsStore } from '@/data/collections'
import { uid } from '@/lib/id'
import { nowISO } from '@/lib/date'
import type { MealItem, MealType } from '@/types'

const key = (i: MealItem) => i.name.trim().toLowerCase()

/** Favorite foods + saved meal templates for faster repeat logging. */
export function useMealLibrary() {
  const foods = useCollection(savedFoodsStore)
  const meals = useCollection(savedMealsStore)

  return {
    favorites: [...foods].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    savedMeals: [...meals].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    isFavorite: (i: MealItem) => foods.some((f) => key(f.item) === key(i)),
    toggleFavorite: (i: MealItem) => {
      const existing = foods.find((f) => key(f.item) === key(i))
      if (existing) savedFoodsStore.remove(existing.id)
      else savedFoodsStore.add({ id: uid(), createdAt: nowISO(), item: { ...i } })
    },
    saveMealTemplate: (name: string, items: MealItem[], mealType?: MealType) =>
      savedMealsStore.add({ id: uid(), name, items: items.map((i) => ({ ...i })), mealType, createdAt: nowISO() }),
    removeSavedMeal: (id: string) => savedMealsStore.remove(id),
  }
}
