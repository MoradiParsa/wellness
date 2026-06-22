import { createCollection, createSingleton } from './store'
import { DEFAULT_SETTINGS } from '@/lib/constants'
import type {
  Settings,
  Exercise,
  Program,
  WorkoutSession,
  Meal,
  WaterEntry,
  WeightEntry,
  Task,
  CalorieAdjustment,
  HealthEntry,
  SavedFood,
  SavedMeal,
  VerifiedFood,
} from '@/types'

// Central registry of every persisted collection. To migrate to a backend
// later, swap the underlying `storage` adapter — these call sites don't change.

export const settingsStore = createSingleton<Settings>('settings', DEFAULT_SETTINGS)
export const exercisesStore = createCollection<Exercise>('exercises')
export const programsStore = createCollection<Program>('programs')
export const workoutsStore = createCollection<WorkoutSession>('workouts')
export const mealsStore = createCollection<Meal>('meals')
export const waterStore = createCollection<WaterEntry>('water')
export const weightsStore = createCollection<WeightEntry>('weights')
export const tasksStore = createCollection<Task>('tasks')
export const adjustmentsStore = createCollection<CalorieAdjustment>('adjustments')
export const healthStore = createCollection<HealthEntry>('health')
export const savedFoodsStore = createCollection<SavedFood>('savedFoods')
export const savedMealsStore = createCollection<SavedMeal>('savedMeals')
export const verifiedFoodsStore = createCollection<VerifiedFood>('verifiedFoods')
