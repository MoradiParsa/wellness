import { useCollection } from '@/data/store'
import { exercisesStore } from '@/data/collections'
import { uid } from '@/lib/id'
import type { Exercise } from '@/types'

export function useExercises() {
  const exercises = useCollection(exercisesStore)

  return {
    exercises: [...exercises].sort((a, b) => a.name.localeCompare(b.name)),
    getById: (id: string) => exercisesStore.getById(id),
    add: (data: Omit<Exercise, 'id' | 'isCustom'>) => {
      const ex: Exercise = { ...data, id: uid(), isCustom: true }
      exercisesStore.add(ex)
      return ex
    },
    update: (id: string, patch: Partial<Exercise>) => exercisesStore.update(id, patch),
    remove: (id: string) => exercisesStore.remove(id),
  }
}

export const getExercise = (id: string) => exercisesStore.getById(id)
export const exerciseName = (id: string) => exercisesStore.getById(id)?.name ?? 'Exercise'
