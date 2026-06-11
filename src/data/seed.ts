import type { Exercise, ExerciseCategory } from '@/types'
import { exercisesStore } from './collections'

type SeedRow = [string, string, string, string, ExerciseCategory]
// [id, name, muscleGroup, equipment, category]

const ROWS: SeedRow[] = [
  ['ex-barbell-bench-press', 'Barbell Bench Press', 'Chest', 'Barbell', 'compound'],
  ['ex-incline-db-press', 'Incline Dumbbell Press', 'Chest', 'Dumbbell', 'compound'],
  ['ex-cable-fly', 'Cable Fly', 'Chest', 'Cable', 'isolation'],
  ['ex-push-up', 'Push-Up', 'Chest', 'Bodyweight', 'compound'],
  ['ex-deadlift', 'Deadlift', 'Back', 'Barbell', 'compound'],
  ['ex-barbell-row', 'Barbell Row', 'Back', 'Barbell', 'compound'],
  ['ex-pull-up', 'Pull-Up', 'Back', 'Bodyweight', 'compound'],
  ['ex-lat-pulldown', 'Lat Pulldown', 'Back', 'Cable', 'compound'],
  ['ex-seated-cable-row', 'Seated Cable Row', 'Back', 'Cable', 'compound'],
  ['ex-overhead-press', 'Overhead Press', 'Shoulders', 'Barbell', 'compound'],
  ['ex-db-shoulder-press', 'Dumbbell Shoulder Press', 'Shoulders', 'Dumbbell', 'compound'],
  ['ex-lateral-raise', 'Lateral Raise', 'Shoulders', 'Dumbbell', 'isolation'],
  ['ex-rear-delt-fly', 'Rear Delt Fly', 'Shoulders', 'Dumbbell', 'isolation'],
  ['ex-face-pull', 'Face Pull', 'Shoulders', 'Cable', 'isolation'],
  ['ex-back-squat', 'Back Squat', 'Quads', 'Barbell', 'compound'],
  ['ex-front-squat', 'Front Squat', 'Quads', 'Barbell', 'compound'],
  ['ex-leg-press', 'Leg Press', 'Quads', 'Machine', 'compound'],
  ['ex-leg-extension', 'Leg Extension', 'Quads', 'Machine', 'isolation'],
  ['ex-walking-lunge', 'Walking Lunge', 'Quads', 'Dumbbell', 'compound'],
  ['ex-romanian-deadlift', 'Romanian Deadlift', 'Hamstrings', 'Barbell', 'compound'],
  ['ex-leg-curl', 'Lying Leg Curl', 'Hamstrings', 'Machine', 'isolation'],
  ['ex-hip-thrust', 'Hip Thrust', 'Glutes', 'Barbell', 'compound'],
  ['ex-bulgarian-split-squat', 'Bulgarian Split Squat', 'Glutes', 'Dumbbell', 'compound'],
  ['ex-barbell-curl', 'Barbell Curl', 'Biceps', 'Barbell', 'isolation'],
  ['ex-db-curl', 'Dumbbell Curl', 'Biceps', 'Dumbbell', 'isolation'],
  ['ex-hammer-curl', 'Hammer Curl', 'Biceps', 'Dumbbell', 'isolation'],
  ['ex-tricep-pushdown', 'Tricep Pushdown', 'Triceps', 'Cable', 'isolation'],
  ['ex-overhead-tricep-ext', 'Overhead Tricep Extension', 'Triceps', 'Dumbbell', 'isolation'],
  ['ex-close-grip-bench', 'Close-Grip Bench Press', 'Triceps', 'Barbell', 'compound'],
  ['ex-standing-calf-raise', 'Standing Calf Raise', 'Calves', 'Machine', 'isolation'],
  ['ex-seated-calf-raise', 'Seated Calf Raise', 'Calves', 'Machine', 'isolation'],
  ['ex-hanging-leg-raise', 'Hanging Leg Raise', 'Abs', 'Bodyweight', 'isolation'],
  ['ex-cable-crunch', 'Cable Crunch', 'Abs', 'Cable', 'isolation'],
  ['ex-plank', 'Plank', 'Abs', 'Bodyweight', 'isolation'],
  ['ex-wrist-curl', 'Wrist Curl', 'Forearms', 'Dumbbell', 'isolation'],
  ['ex-barbell-shrug', 'Barbell Shrug', 'Traps', 'Barbell', 'isolation'],
  ['ex-incline-bench-press', 'Incline Barbell Press', 'Chest', 'Barbell', 'compound'],
  ['ex-chest-press-machine', 'Chest Press Machine', 'Chest', 'Machine', 'compound'],
  ['ex-pendlay-row', 'Pendlay Row', 'Back', 'Barbell', 'compound'],
  ['ex-goblet-squat', 'Goblet Squat', 'Quads', 'Dumbbell', 'compound'],
]

export const EXERCISE_LIBRARY: Exercise[] = ROWS.map(([id, name, muscleGroup, equipment, category]) => ({
  id,
  name,
  muscleGroup,
  equipment,
  category,
  isCustom: false,
}))

/** Seed the curated exercise library on first run (no workout templates). */
export function ensureSeeded(): void {
  if (exercisesStore.getAll().length === 0) {
    exercisesStore.addMany(EXERCISE_LIBRARY)
  }
}
