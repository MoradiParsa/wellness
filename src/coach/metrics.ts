import { subDays } from 'date-fns'
import { dateKey, daysAgo } from '@/lib/date'
import type { SetLog, WorkoutEntry, WorkoutSession, WeightEntry } from '@/types'

// ---------------------------------------------------------------------------
// Strength metrics
// ---------------------------------------------------------------------------

/** Epley estimated 1RM. */
export function epley1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

const workingSets = (entry: WorkoutEntry): SetLog[] =>
  entry.sets.filter((s) => s.reps > 0)

export function entryVolume(entry: WorkoutEntry): number {
  return workingSets(entry).reduce((v, s) => v + s.weight * s.reps, 0)
}

export function bestSet(entry: WorkoutEntry): SetLog | null {
  let best: SetLog | null = null
  let bestE1RM = -1
  for (const s of workingSets(entry)) {
    const e = epley1RM(s.weight, s.reps)
    if (e > bestE1RM) {
      bestE1RM = e
      best = s
    }
  }
  return best
}

export function topWeight(entry: WorkoutEntry): number {
  return workingSets(entry).reduce((m, s) => Math.max(m, s.weight), 0)
}

export interface ExerciseSessionPoint {
  date: string
  e1rm: number
  topWeight: number
  volume: number
  bestReps: number
}

/** Per-session best-set progression for one exercise (chronological). */
export function strengthSeries(
  sessions: WorkoutSession[],
  exerciseId: string,
): ExerciseSessionPoint[] {
  return sessions
    .filter((s) => s.entries.some((e) => e.exerciseId === exerciseId))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => {
      const entry = s.entries.find((e) => e.exerciseId === exerciseId)!
      const best = bestSet(entry)
      return {
        date: s.date,
        e1rm: best ? epley1RM(best.weight, best.reps) : 0,
        topWeight: topWeight(entry),
        volume: entryVolume(entry),
        bestReps: best?.reps ?? 0,
      }
    })
}

export interface ExercisePR {
  maxWeight: number
  maxWeightReps: number
  maxE1RM: number
  maxVolume: number
  maxReps: number
}

export function exercisePRs(sessions: WorkoutSession[], exerciseId: string): ExercisePR {
  const pr: ExercisePR = { maxWeight: 0, maxWeightReps: 0, maxE1RM: 0, maxVolume: 0, maxReps: 0 }
  for (const s of sessions) {
    const entry = s.entries.find((e) => e.exerciseId === exerciseId)
    if (!entry) continue
    pr.maxVolume = Math.max(pr.maxVolume, entryVolume(entry))
    for (const set of workingSets(entry)) {
      if (set.weight > pr.maxWeight) {
        pr.maxWeight = set.weight
        pr.maxWeightReps = set.reps
      }
      pr.maxReps = Math.max(pr.maxReps, set.reps)
      pr.maxE1RM = Math.max(pr.maxE1RM, epley1RM(set.weight, set.reps))
    }
  }
  return pr
}

export function totalVolume(sessions: WorkoutSession[], exerciseId?: string): number {
  return sessions.reduce((sum, s) => {
    const entries = exerciseId ? s.entries.filter((e) => e.exerciseId === exerciseId) : s.entries
    return sum + entries.reduce((v, e) => v + entryVolume(e), 0)
  }, 0)
}

export function volumeWithinDays(
  sessions: WorkoutSession[],
  days: number,
  exerciseId?: string,
): number {
  return totalVolume(
    sessions.filter((s) => daysAgo(s.date) < days),
    exerciseId,
  )
}

// ---------------------------------------------------------------------------
// Streaks & consistency
// ---------------------------------------------------------------------------

/** Consecutive days (ending today or yesterday) present in the set of keys. */
export function currentStreak(keys: string[]): number {
  const set = new Set(keys)
  let cursor = new Date()
  if (!set.has(dateKey(cursor))) {
    cursor = subDays(cursor, 1)
    if (!set.has(dateKey(cursor))) return 0
  }
  let streak = 0
  while (set.has(dateKey(cursor))) {
    streak++
    cursor = subDays(cursor, 1)
  }
  return streak
}

export function longestStreak(keys: string[]): number {
  const sorted = [...new Set(keys)].sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const k of sorted) {
    run = prev && diffDays(prev, k) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = k
  }
  return best
}

function diffDays(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00').getTime()
  const db = new Date(b + 'T00:00:00').getTime()
  return Math.round((db - da) / 86400000)
}

export function countWithinDays(keys: string[], days: number): number {
  const unique = new Set(keys.filter((k) => daysAgo(k) < days))
  return unique.size
}

// ---------------------------------------------------------------------------
// Weight trend & projection
// ---------------------------------------------------------------------------

export function averageWithinDays(entries: WeightEntry[], days: number): number | null {
  const within = entries.filter((e) => daysAgo(e.date) < days)
  if (within.length === 0) return null
  return within.reduce((s, e) => s + e.weight, 0) / within.length
}

/** Linear-regression slope of weight in kg/day over the recent window. */
export function trendSlopePerDay(entries: WeightEntry[], windowDays = 21): number | null {
  const within = entries
    .filter((e) => daysAgo(e.date) < windowDays)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (within.length < 2) return null
  const points = within.map((e) => ({ x: -daysAgo(e.date), y: e.weight }))
  const n = points.length
  const sumX = points.reduce((s, p) => s + p.x, 0)
  const sumY = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0)
  const denom = n * sumXX - sumX * sumX
  if (denom === 0) return null
  return (n * sumXY - sumX * sumY) / denom
}

export interface WeightTrend {
  avg7: number | null
  avg30: number | null
  /** kg/week (positive = gaining) */
  weeklyRate: number | null
  /** kg over last 7 days vs previous, approximated from slope */
  weeklyChange: number | null
  monthlyChange: number | null
  current: number | null
  /** projected date key to reach goal, or null if not trending toward it */
  projectedGoalDate: string | null
}

// ---- body composition ----

export const BONE_PERCENTAGE = 0.084 // 8.4%

export interface BodyComposition {
  fatMassKg: number
  muscleMassKg: number
  waterMassKg: number
  boneMassKg: number
  otherMassKg: number
  fatPercent: number
  musclePercent: number
  waterPercent: number
}

/**
 * Calculate body composition breakdown from a weight entry with body metrics.
 * Percentages may overlap (smart scales estimate differently), so totals don't always equal 100%.
 */
export function calculateBodyComposition(entry: WeightEntry): BodyComposition {
  const fat = entry.weight * (entry.bodyFat ?? 0) / 100
  const muscle = entry.weight * (entry.muscle ?? 0) / 100
  const water = entry.weight * (entry.water ?? 0) / 100
  const bone = entry.weight * BONE_PERCENTAGE
  const other = Math.max(0, entry.weight - fat - muscle - water - bone)
  return {
    fatMassKg: fat,
    muscleMassKg: muscle,
    waterMassKg: water,
    boneMassKg: bone,
    otherMassKg: other,
    fatPercent: entry.bodyFat ?? 0,
    musclePercent: entry.muscle ?? 0,
    waterPercent: entry.water ?? 0,
  }
}

export function computeWeightTrend(
  entries: WeightEntry[],
  goalWeightKg: number,
): WeightTrend {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const current = sorted.length ? sorted[sorted.length - 1].weight : null
  const slope = trendSlopePerDay(sorted)
  const weeklyRate = slope == null ? null : slope * 7
  const monthlyChange = slope == null ? null : slope * 30
  const smoothedCurrent = averageWithinDays(sorted, 7) ?? current

  let projectedGoalDate: string | null = null
  if (slope != null && smoothedCurrent != null && Math.abs(slope) > 1e-4) {
    const remaining = goalWeightKg - smoothedCurrent
    const movingToward = Math.sign(remaining) === Math.sign(slope)
    if (movingToward) {
      const days = remaining / slope
      if (days > 0 && days < 365 * 3) {
        const d = new Date()
        d.setDate(d.getDate() + Math.round(days))
        projectedGoalDate = dateKey(d)
      }
    }
  }

  return {
    avg7: averageWithinDays(sorted, 7),
    avg30: averageWithinDays(sorted, 30),
    weeklyRate,
    weeklyChange: weeklyRate,
    monthlyChange,
    current,
    projectedGoalDate,
  }
}
