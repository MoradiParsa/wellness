// ============================================================================
// Progress OS — Domain Types
// All physical quantities are stored in canonical SI units:
//   weight -> kilograms (kg), length -> centimeters (cm), volume -> milliliters
//   (ml), energy -> kilocalories (kcal). The format layer converts for display.
// ============================================================================

export type UnitWeight = 'lb' | 'kg'
export type UnitLength = 'in' | 'cm'
export type Phase = 'bulk' | 'cut' | 'maintain'
export type TimeOfDay = 'morning' | 'evening'
export type ExerciseCategory = 'compound' | 'isolation'
export type TaskCategory = 'fitness' | 'nutrition' | 'personal' | 'habits'
export type TaskPriority = 'low' | 'medium' | 'high'
export type Recurrence = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type AiProvider = 'claude' | 'openai'
export type FoodSource = 'local' | 'usda' | 'openfoodfacts' | 'ai' | 'manual' | 'verified'

/** How confident the lookup is in a resolved food. */
export type MatchQuality = 'exact' | 'close' | 'generic' | 'estimate'

/** Body profile used by the Smart Calorie Engine to estimate TDEE. */
export interface Profile {
  sex: Sex
  age: number
  /** centimeters */
  heightCm: number
  activityLevel: ActivityLevel
  trainingDaysPerWeek: number
  /** desired body-weight change per week, in kilograms (magnitude; direction from phase) */
  desiredRateKg: number
}

/** Free-first nutrition / AI configuration. Paid AI is OFF by default. */
export interface AiSettings {
  paidAiEnabled: boolean
  provider: AiProvider
  apiKey: string
  /** Free USDA FoodData Central key (optional; DEMO_KEY used as fallback). */
  usdaKey: string
  /** Optional self-hosted proxy endpoint (future). */
  proxyUrl: string
  /** Max paid AI calls allowed per month. */
  monthlyAiLimit: number
  /** Usage counter, reset each calendar month (YYYY-MM). */
  usageMonth: string
  usageCount: number
}

export interface Settings {
  units: { weight: UnitWeight; length: UnitLength }
  phase: Phase
  /** kcal / day — auto-computed by the engine unless autoCalories is false */
  calorieTarget: number
  /** grams / day */
  proteinTarget: number
  carbTarget: number
  fatTarget: number
  fiberTarget: number
  /** milliliters / day */
  waterTarget: number
  /** kilograms */
  goalWeight: number
  name?: string
  darkMode: boolean
  activeProgramId: string | null
  lastRoute: string
  onboardingComplete: boolean
  schemaVersion: number

  // ---- Smart nutrition ----
  profile: Profile
  /** Engine drives calorie target when true; false = manual override. */
  autoCalories: boolean
  /** Engine drives macro split when true; false = manual override. */
  autoMacros: boolean
  /** Estimated maintenance calories (TDEE) from the last computation. */
  estimatedTDEE: number
  /** ISO date key of the last weekly auto-adjustment. */
  lastWeeklyAdjust?: string
  ai: AiSettings
}

export interface CalorieAdjustment {
  id: string
  /** ISO date key */
  date: string
  fromCalories: number
  toCalories: number
  /** kg/week */
  expectedRate: number
  actualRate: number
  reason: string
}

export interface Exercise {
  id: string
  name: string
  muscleGroup: string
  equipment: string
  category: ExerciseCategory
  notes?: string
  isCustom: boolean
}

/** A planned exercise inside a program day (the progressive-overload baseline). */
export interface ProgramExercise {
  exerciseId: string
  targetSets: number
  repsLow: number
  repsHigh: number
  /** kilograms */
  startingWeight: number
  targetRPE?: number
  targetRIR?: number
  /** seconds */
  restSec: number
  tempo?: string
  notes?: string
}

export interface ProgramDay {
  id: string
  name: string
  order: number
  exercises: ProgramExercise[]
}

export interface Program {
  id: string
  name: string
  days: ProgramDay[]
  createdAt: string
}

/** One logged set. */
export interface SetLog {
  id: string
  /** kilograms */
  weight: number
  reps: number
  rpe?: number
  rir?: number
  /** seconds */
  restSec?: number
  tempo?: string
  completed: boolean
  notes?: string
}

export interface WorkoutEntry {
  exerciseId: string
  sets: SetLog[]
  notes?: string
}

export interface WorkoutSession {
  id: string
  /** ISO date key (YYYY-MM-DD) */
  date: string
  programId?: string
  programDayId?: string
  name: string
  entries: WorkoutEntry[]
  durationSec?: number
  sessionNotes?: string
  createdAt: string
}

/** A single resolved food line inside a meal (from parsing / lookup / AI). */
export interface MealItem {
  name: string
  quantity: number
  unit: string
  /** resolved grams when applicable */
  grams?: number
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  source: FoodSource
  /** 0–1 confidence for AI estimates */
  confidence?: number
  /** brand name when resolved from a branded product */
  brand?: string
  /** how confident the lookup was — drives the review-screen label */
  match?: MatchQuality
}

export interface Meal {
  id: string
  /** ISO date key (YYYY-MM-DD) */
  date: string
  name: string
  /** kcal */
  calories: number
  /** grams */
  protein: number
  carbs: number
  fat: number
  fiber?: number
  /** base64 data URL */
  photo?: string
  mealType?: MealType
  /** HH:mm */
  time?: string
  notes?: string
  /** itemized breakdown when logged via Smart Add */
  items?: MealItem[]
  createdAt: string
}

export interface WaterEntry {
  id: string
  /** ISO date key (YYYY-MM-DD) — one aggregate row per day */
  date: string
  /** milliliters */
  amount: number
}

export interface WeightEntry {
  id: string
  /** ISO date key (YYYY-MM-DD) */
  date: string
  /** kilograms */
  weight: number
  bodyFat?: number
  muscle?: number
  water?: number
  fasted: boolean
  timeOfDay: TimeOfDay
  notes?: string
  /** base64 data URL */
  photo?: string
  createdAt: string
}

/** A manually-entered / pasted daily health row (Garmin → Apple Health → here). */
export interface HealthEntry {
  /** = ISO date key (one row per day) */
  id: string
  date: string
  steps?: number
  /** kcal burned through activity */
  activeCalories?: number
  /** total kcal burned (active + resting) */
  caloriesBurned?: number
  sleepHours?: number
  restingHeartRate?: number
  avgHeartRate?: number
  workoutMinutes?: number
  notes?: string
}

/** A single favorited food for one-tap re-adding. */
export interface SavedFood {
  id: string
  createdAt: string
  item: MealItem
}

/** A user-verified food (barcode, label scan, or confirmed branded product). */
export interface VerifiedFood {
  id: string
  name: string
  brand?: string
  /** macros per 100 g */
  per100g: { calories: number; protein: number; carbs: number; fat: number; fiber: number }
  /** grams in one serving (for slice/serving/piece units) */
  servingGrams?: number
  /** label for one serving, e.g. "slice", "cup", "container" */
  servingLabel?: string
  /** extra label facts kept for reference (per serving) */
  sugar?: number
  sodium?: number
  barcode?: string
  createdAt: string
}

/** A named, reusable multi-food meal template. */
export interface SavedMeal {
  id: string
  name: string
  items: MealItem[]
  mealType?: MealType
  createdAt: string
}

export interface Task {
  id: string
  title: string
  notes?: string
  category: TaskCategory
  priority: TaskPriority
  /** ISO date key (YYYY-MM-DD) */
  dueDate?: string
  completed: boolean
  completedAt?: string
  recurrence: Recurrence
  createdAt: string
}

// ---------------------------------------------------------------------------
// Derived / coach types
// ---------------------------------------------------------------------------

export type OverloadAction = 'increase' | 'hold' | 'decrease' | 'none'

export interface OverloadSuggestion {
  exerciseId: string
  action: OverloadAction
  /** kilograms — suggested working weight for next session */
  suggestedWeight: number
  message: string
}

export interface ExerciseStats {
  exerciseId: string
  estOneRepMax: number
  bestSetWeight: number
  bestSetReps: number
  totalVolume: number
  lastPerformed?: string
}

export interface CoachMessage {
  id: string
  title: string
  body: string
  tone: 'positive' | 'neutral' | 'warning'
}
