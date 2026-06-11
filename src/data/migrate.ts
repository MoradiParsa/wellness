import { APP_NAME, SCHEMA_VERSION, DEFAULT_SETTINGS } from '@/lib/constants'
import { nowISO } from '@/lib/date'
import {
  settingsStore,
  exercisesStore,
  programsStore,
  workoutsStore,
  mealsStore,
  waterStore,
  weightsStore,
  tasksStore,
  adjustmentsStore,
} from './collections'
import { ensureSeeded } from './seed'

export interface ExportBundle {
  app: string
  version: number
  exportedAt: string
  settings: ReturnType<typeof settingsStore.get>
  exercises: ReturnType<typeof exercisesStore.getAll>
  programs: ReturnType<typeof programsStore.getAll>
  workouts: ReturnType<typeof workoutsStore.getAll>
  meals: ReturnType<typeof mealsStore.getAll>
  water: ReturnType<typeof waterStore.getAll>
  weights: ReturnType<typeof weightsStore.getAll>
  tasks: ReturnType<typeof tasksStore.getAll>
  adjustments: ReturnType<typeof adjustmentsStore.getAll>
}

export function buildExport(): ExportBundle {
  return {
    app: APP_NAME,
    version: SCHEMA_VERSION,
    exportedAt: nowISO(),
    settings: settingsStore.get(),
    exercises: exercisesStore.getAll(),
    programs: programsStore.getAll(),
    workouts: workoutsStore.getAll(),
    meals: mealsStore.getAll(),
    water: waterStore.getAll(),
    weights: weightsStore.getAll(),
    tasks: tasksStore.getAll(),
    adjustments: adjustmentsStore.getAll(),
  }
}

export function exportData(): string {
  return JSON.stringify(buildExport(), null, 2)
}

export function importData(json: string): { ok: boolean; error?: string } {
  try {
    const parsed = JSON.parse(json) as Partial<ExportBundle>
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'File is not valid JSON.' }
    }
    if (parsed.app && parsed.app !== APP_NAME) {
      return { ok: false, error: 'This file is not a Progress OS backup.' }
    }
    if (parsed.settings) settingsStore.replace({ ...DEFAULT_SETTINGS, ...parsed.settings })
    if (parsed.exercises) exercisesStore.setAll(parsed.exercises)
    if (parsed.programs) programsStore.setAll(parsed.programs)
    if (parsed.workouts) workoutsStore.setAll(parsed.workouts)
    if (parsed.meals) mealsStore.setAll(parsed.meals)
    if (parsed.water) waterStore.setAll(parsed.water)
    if (parsed.weights) weightsStore.setAll(parsed.weights)
    if (parsed.tasks) tasksStore.setAll(parsed.tasks)
    if (parsed.adjustments) adjustmentsStore.setAll(parsed.adjustments)
    ensureSeeded()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Import failed.' }
  }
}

/** Wipe all data and return to a fresh first-run state. */
export function resetAll(): void {
  exercisesStore.clear()
  programsStore.clear()
  workoutsStore.clear()
  mealsStore.clear()
  waterStore.clear()
  weightsStore.clear()
  tasksStore.clear()
  adjustmentsStore.clear()
  settingsStore.replace({ ...DEFAULT_SETTINGS })
  ensureSeeded()
}
