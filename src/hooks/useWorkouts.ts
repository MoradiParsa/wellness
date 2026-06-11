import { useCollection } from '@/data/store'
import { workoutsStore } from '@/data/collections'
import { uid } from '@/lib/id'
import { nowISO } from '@/lib/date'
import type { WorkoutSession, WorkoutEntry } from '@/types'

function sortByDateDesc(a: WorkoutSession, b: WorkoutSession) {
  if (a.date === b.date) return b.createdAt.localeCompare(a.createdAt)
  return b.date.localeCompare(a.date)
}

export function useWorkouts() {
  const workouts = useCollection(workoutsStore)
  const sorted = [...workouts].sort(sortByDateDesc)

  return {
    workouts: sorted,
    getById: (id: string) => workoutsStore.getById(id),
    create: (session: Omit<WorkoutSession, 'id' | 'createdAt'>) => {
      const s: WorkoutSession = { ...session, id: uid(), createdAt: nowISO() }
      workoutsStore.add(s)
      return s
    },
    save: (session: WorkoutSession) => workoutsStore.upsert(session),
    remove: (id: string) => workoutsStore.remove(id),
  }
}

/** Most recent completed entry for an exercise (for "previous performance"). */
export function lastEntryForExercise(
  exerciseId: string,
  beforeDate?: string,
): { session: WorkoutSession; entry: WorkoutEntry } | null {
  const all = [...workoutsStore.getAll()].sort(sortByDateDesc)
  for (const session of all) {
    if (beforeDate && session.date >= beforeDate) continue
    const entry = session.entries.find((e) => e.exerciseId === exerciseId && e.sets.length > 0)
    if (entry) return { session, entry }
  }
  return null
}

export function allEntriesForExercise(exerciseId: string): {
  date: string
  entry: WorkoutEntry
}[] {
  return [...workoutsStore.getAll()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((s) =>
      s.entries
        .filter((e) => e.exerciseId === exerciseId)
        .map((entry) => ({ date: s.date, entry })),
    )
}
