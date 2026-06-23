import type {
  Settings,
  TaskCategory,
  TaskPriority,
  Recurrence,
  Phase,
  MealType,
  ExerciseCategory,
  ActivityLevel,
} from '@/types'

export const APP_NAME = 'Progress OS'
export const SCHEMA_VERSION = 2

export const ACTIVITY_LEVELS: {
  value: ActivityLevel
  label: string
  blurb: string
  multiplier: number
}[] = [
  { value: 'sedentary', label: 'Sedentary', blurb: 'Desk job, little exercise', multiplier: 1.2 },
  { value: 'light', label: 'Lightly active', blurb: 'Light exercise 1–3 days/wk', multiplier: 1.375 },
  { value: 'moderate', label: 'Moderately active', blurb: 'Training 3–5 days/wk', multiplier: 1.55 },
  { value: 'active', label: 'Very active', blurb: 'Training 6–7 days/wk', multiplier: 1.725 },
  { value: 'very_active', label: 'Extremely active', blurb: 'Physical job + daily training', multiplier: 1.9 },
]

/** Suggested desired rate presets per phase, in lb/week (UI converts to kg). */
export const RATE_PRESETS: Record<Phase, { label: string; lbPerWeek: number }[]> = {
  bulk: [
    { label: 'Lean (0.25 lb/wk)', lbPerWeek: 0.25 },
    { label: 'Standard (0.5 lb/wk)', lbPerWeek: 0.5 },
    { label: 'Aggressive (0.75 lb/wk)', lbPerWeek: 0.75 },
  ],
  cut: [
    { label: 'Slow (0.5 lb/wk)', lbPerWeek: 0.5 },
    { label: 'Standard (1.0 lb/wk)', lbPerWeek: 1.0 },
    { label: 'Aggressive (1.5 lb/wk)', lbPerWeek: 1.5 },
  ],
  maintain: [{ label: 'Hold steady', lbPerWeek: 0 }],
}

export const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Biceps',
  'Triceps',
  'Calves',
  'Abs',
  'Forearms',
  'Traps',
  'Full Body',
] as const

export const EQUIPMENT = [
  'Barbell',
  'Dumbbell',
  'Machine',
  'Cable',
  'Bodyweight',
  'Kettlebell',
  'Bands',
  'Other',
] as const

export const EXERCISE_CATEGORIES: { value: ExerciseCategory; label: string }[] = [
  { value: 'compound', label: 'Compound' },
  { value: 'isolation', label: 'Isolation' },
]

export const TASK_CATEGORIES: { value: TaskCategory; label: string; color: string }[] = [
  { value: 'fitness', label: 'Fitness', color: 'hsl(var(--foreground))' },
  { value: 'nutrition', label: 'Nutrition', color: 'hsl(var(--success))' },
  { value: 'personal', label: 'Personal', color: 'hsl(var(--warning))' },
  { value: 'habits', label: 'Habits', color: 'hsl(217 91% 60%)' },
]

export const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export const RECURRENCES: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'No repeat' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
]

export const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
]

export const PHASES: { value: Phase; label: string; blurb: string }[] = [
  { value: 'bulk', label: 'Bulking', blurb: 'Build muscle with a controlled surplus.' },
  { value: 'cut', label: 'Cutting', blurb: 'Lose fat while keeping strength.' },
  { value: 'maintain', label: 'Maintaining', blurb: 'Hold steady and recomposition.' },
]

export const DEFAULT_SETTINGS: Settings = {
  units: { weight: 'lb', length: 'in' },
  phase: 'bulk',
  calorieTarget: 2800,
  proteinTarget: 180,
  carbTarget: 320,
  fatTarget: 80,
  fiberTarget: 35,
  waterTarget: 3785, // ml (~1 US gallon)
  goalWeight: 90.7, // kg (~200 lb)
  darkMode: true,
  activeProgramId: null,
  lastRoute: '/',
  onboardingComplete: false,
  schemaVersion: SCHEMA_VERSION,
  profile: {
    sex: 'male',
    age: 25,
    heightCm: 178,
    activityLevel: 'moderate',
    trainingDaysPerWeek: 4,
    desiredRateKg: 0.5 / 2.20462, // ~0.5 lb/wk
  },
  autoCalories: true,
  autoMacros: true,
  estimatedTDEE: 2800,
  ai: {
    paidAiEnabled: false,
    provider: 'claude',
    apiKey: '',
    usdaKey: '',
    proxyUrl: '',
    monthlyAiLimit: 50,
    usageMonth: '',
    usageCount: 0,
  },
  bottomBarVisibleKeys: ['dashboard', 'workout', 'weight', 'more'],
  boneBodyPercent: 8.4,
}
