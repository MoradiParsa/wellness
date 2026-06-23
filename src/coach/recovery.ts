// ============================================================================
// Recovery Score — a transparent 0–100 readiness score from manual health data
// (sleep, resting/avg HR, steps) plus training load and weight trend.
// Baseline 70; each factor adds/subtracts a few points. No black box.
// ============================================================================

import { healthStore, workoutsStore, weightsStore, settingsStore } from '@/data/collections'
import { daysAgo, todayKey } from '@/lib/date'
import { computeWeightTrend, volumeWithinDays } from './metrics'
import type { HealthEntry } from '@/types'

export type Readiness = 'High' | 'Moderate' | 'Low'

export interface RecoveryFactor {
  label: string
  points: number
}

export interface RecoveryResult {
  available: boolean
  score: number
  readiness: Readiness
  recommendation: string
  factors: RecoveryFactor[]
  date: string
}

const BASE = 70

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

export function readinessFor(score: number): Readiness {
  return score >= 75 ? 'High' : score >= 50 ? 'Moderate' : 'Low'
}

export function recommendationFor(r: Readiness): string {
  if (r === 'High') return 'Train normally today — you’re well recovered. A good day to push for PRs.'
  if (r === 'Moderate') return 'Train as planned, but keep a rep or two in reserve and prioritize sleep tonight.'
  return 'Focus on recovery and avoid max-effort sets. Prioritize sleep, food, and hydration.'
}

function rhrBaseline(): number | null {
  const vals = healthStore
    .getAll()
    .filter((h) => daysAgo(h.date) >= 1 && daysAgo(h.date) < 28 && h.restingHeartRate != null)
    .map((h) => h.restingHeartRate as number)
  if (vals.length < 3) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

/** Recovery contribution from one day's health metrics. */
function healthFactors(h: HealthEntry | undefined, baseline: number | null): RecoveryFactor[] {
  const f: RecoveryFactor[] = []
  if (!h) return f
  if (h.sleepHours != null) {
    const s = h.sleepHours
    const points = s < 5 ? -20 : s < 6 ? -12 : s < 7 ? -4 : s <= 9 ? 12 : 4
    f.push({ label: `Sleep ${s}h`, points })
  }
  if (h.restingHeartRate != null) {
    const rhr = h.restingHeartRate
    let points: number
    if (baseline != null) {
      const d = rhr - baseline
      points = d >= 8 ? -18 : d >= 4 ? -8 : d <= -2 ? 6 : 2
    } else {
      points = rhr > 75 ? -4 : rhr < 60 ? 5 : 0
    }
    f.push({ label: `Resting HR ${rhr}`, points })
  }
  if (h.steps != null) {
    const points = h.steps > 16000 ? -4 : h.steps >= 6000 ? 3 : h.steps < 3000 ? -2 : 0
    f.push({ label: `${h.steps.toLocaleString()} steps`, points })
  }
  return f
}

/** Recovery contribution from recent training load. */
function trainingFactors(): RecoveryFactor[] {
  const workouts = workoutsStore.getAll()
  const f: RecoveryFactor[] = []
  const freq7 = new Set(workouts.filter((w) => daysAgo(w.date) < 7).map((w) => w.date)).size
  if (freq7 >= 6) f.push({ label: `${freq7} sessions in 7 days`, points: -8 })
  else if (freq7 <= 1) f.push({ label: freq7 === 1 ? '1 session this week' : 'Rest week so far', points: 4 })

  const vol7 = volumeWithinDays(workouts, 7)
  const prior = volumeWithinDays(workouts, 14) - vol7
  if (prior > 0 && vol7 > prior * 1.6) f.push({ label: 'Training load spiked', points: -8 })
  return f
}

/** Today's recovery (uses the latest health entry within 2 days). */
export function currentRecovery(): RecoveryResult {
  const today = [...healthStore.getAll()]
    .filter((h) => daysAgo(h.date) <= 2)
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  const baseline = rhrBaseline()

  const factors: RecoveryFactor[] = [...healthFactors(today, baseline), ...trainingFactors()]

  const s = settingsStore.get()
  const trend = computeWeightTrend(weightsStore.getAll(), s.goalWeight)
  if (trend.weeklyRate != null) {
    factors.push({ label: 'Weight trend steady', points: Math.abs(trend.weeklyRate) < 0.9 ? 3 : -2 })
  }

  const hasHealth =
    !!today && (today.sleepHours != null || today.restingHeartRate != null || today.steps != null)
  const hasTraining = workoutsStore.getAll().some((w) => daysAgo(w.date) < 14)
  const available = hasHealth || hasTraining

  const score = clamp(BASE + factors.reduce((a, f) => a + f.points, 0))
  const readiness = readinessFor(score)
  return {
    available,
    score,
    readiness,
    recommendation: recommendationFor(readiness),
    factors,
    date: today?.date ?? todayKey(),
  }
}

/** Per-day health-driven recovery scores for the trend chart (chronological). */
export function recoverySeries(days = 14): { date: string; score: number }[] {
  const baseline = rhrBaseline()
  return healthStore
    .getAll()
    .filter((h) => daysAgo(h.date) < days)
    .map((h) => ({ h, f: healthFactors(h, baseline) }))
    .filter((x) => x.f.length > 0)
    .map((x) => ({ date: x.h.date, score: clamp(BASE + x.f.reduce((a, y) => a + y.points, 0)) }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Recent vs earlier average score (points), for a "trend" indicator. */
export function recoveryTrendDelta(): number | null {
  const ser = recoverySeries(21)
  if (ser.length < 4) return null
  const recent = ser.slice(-3)
  const prior = ser.slice(0, -3)
  const avg = (a: { score: number }[]) => a.reduce((s, x) => s + x.score, 0) / a.length
  return Math.round(avg(recent) - avg(prior))
}
