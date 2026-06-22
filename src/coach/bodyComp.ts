// ============================================================================
// Smart bulk optimization — reads 7-day trends in body composition, protein
// adherence, and (optional) manual health data to coach for muscle gain with
// minimal fat gain. Pure reads from the stores; no side effects.
// ============================================================================

import type { CoachMessage, Settings } from '@/types'
import { weightsStore, mealsStore, healthStore, settingsStore } from '@/data/collections'
import { daysAgo, todayKey } from '@/lib/date'
import { toDisplayWeight } from '@/lib/format'
import { uid } from '@/lib/id'

type CompField = 'bodyFat' | 'muscle' | 'water'

function avgField(lo: number, hi: number, field: CompField): number | null {
  const ws = weightsStore
    .getAll()
    .filter((w) => daysAgo(w.date) >= lo && daysAgo(w.date) < hi && w[field] != null)
  if (ws.length === 0) return null
  return ws.reduce((s, w) => s + (w[field] as number), 0) / ws.length
}

export interface CompTrend {
  /** %/week change in the 7-day average (recent vs prior week) */
  bodyFatDelta: number | null
  muscleDelta: number | null
  waterDelta: number | null
  bodyFatRecent: number | null
  /** avg daily protein over the last 7 logged days ÷ target (0–1+) */
  proteinAdherence: number | null
  avgProtein: number | null
  proteinTarget: number
  loggedDays: number
}

export function compositionTrend(): CompTrend {
  const bfR = avgField(0, 7, 'bodyFat')
  const bfP = avgField(7, 14, 'bodyFat')
  const muR = avgField(0, 7, 'muscle')
  const muP = avgField(7, 14, 'muscle')
  const waR = avgField(0, 7, 'water')
  const waP = avgField(7, 14, 'water')

  const s = settingsStore.get()
  const byDay = new Map<string, number>()
  for (const m of mealsStore.getAll()) {
    if (daysAgo(m.date) < 7) byDay.set(m.date, (byDay.get(m.date) ?? 0) + (m.protein || 0))
  }
  const days = [...byDay.values()]
  const avgProtein = days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null
  const proteinAdherence =
    avgProtein != null && s.proteinTarget > 0 ? avgProtein / s.proteinTarget : null

  return {
    bodyFatDelta: bfR != null && bfP != null ? bfR - bfP : null,
    muscleDelta: muR != null && muP != null ? muR - muP : null,
    waterDelta: waR != null && waP != null ? waR - waP : null,
    bodyFatRecent: bfR,
    proteinAdherence,
    avgProtein,
    proteinTarget: s.proteinTarget,
    loggedDays: days.length,
  }
}

const msg = (title: string, body: string, tone: CoachMessage['tone']): CoachMessage => ({
  id: uid(),
  title,
  body,
  tone,
})

/**
 * Bulk-specific coaching from weight rate + composition + strength. Returns null
 * when there's no strong composition signal, so the caller can fall back to the
 * weight-only bulk/cut coach.
 */
export function bulkOptimizationCoach(
  s: Settings,
  weeklyRateKg: number | null,
  strengthTrendUp: boolean,
  comp: CompTrend,
): CoachMessage | null {
  if (s.phase !== 'bulk' || weeklyRateKg == null) return null
  const unit = s.units.weight
  const rate = `${weeklyRateKg > 0 ? '+' : ''}${toDisplayWeight(weeklyRateKg, unit).toFixed(2)} ${unit}/wk`

  // Protein first — never add calories to fix a protein gap.
  if (comp.proteinAdherence != null && comp.proteinAdherence < 0.8 && comp.loggedDays >= 3) {
    return msg(
      'Hit your protein first',
      `You're averaging ${comp.avgProtein}g protein vs a ${comp.proteinTarget}g target. Get protein up before we change calories — that's what turns a surplus into muscle instead of fat.`,
      'warning',
    )
  }

  const bfUp = comp.bodyFatDelta != null && comp.bodyFatDelta > 0.2
  const bfStable = comp.bodyFatDelta != null && Math.abs(comp.bodyFatDelta) <= 0.2
  const muscleUp = comp.muscleDelta != null && comp.muscleDelta > 0.1
  const waterUp = comp.waterDelta != null && comp.waterDelta > 0.5
  const gainingFast = weeklyRateKg > 0.6
  const flat = weeklyRateKg < 0.1

  // A scale jump alongside a water-% jump is water, not fat.
  if (gainingFast && waterUp) {
    return msg(
      'Scale up — but it’s water',
      `Weight jumped (${rate}) and your water % rose with it, so this is likely water, not fat. Hold calories steady and recheck in a few days.`,
      'neutral',
    )
  }
  // Fat rising faster than muscle → slow the bulk.
  if (bfUp && comp.muscleDelta != null && comp.bodyFatDelta! > comp.muscleDelta) {
    return msg(
      'Fat is outpacing muscle',
      `Body fat is climbing faster than muscle. Trim ~150 kcal/day to keep this a lean bulk.`,
      'warning',
    )
  }
  if (gainingFast && bfUp) {
    return msg(
      'Gaining too fast',
      `Up ${rate} with body fat rising — pull back ~150 kcal/day to keep more of the gain as muscle.`,
      'warning',
    )
  }
  if (flat && !strengthTrendUp) {
    return msg(
      'Bulk has stalled',
      `Weight is flat (${rate}) and strength isn’t moving. Add ~150–200 kcal/day (mostly carbs) to restart growth.`,
      'warning',
    )
  }
  if (muscleUp && bfStable) {
    return msg(
      'Bulk is working',
      `Muscle is trending up with body fat stable — exactly what a controlled bulk should look like. Keep calories where they are.`,
      'positive',
    )
  }
  if (weeklyRateKg >= 0.1 && (bfStable || comp.bodyFatDelta == null) && strengthTrendUp) {
    return msg(
      'Bulk is working',
      `Climbing at ${rate} with strength up and body fat stable. Hold the course.`,
      'positive',
    )
  }
  return null
}

// ---- Manual health-data coaching ------------------------------------------

function recentHealth() {
  const today = healthStore.getById(todayKey())
  if (today) return today
  return [...healthStore.getAll()]
    .filter((h) => daysAgo(h.date) <= 2)
    .sort((a, b) => b.date.localeCompare(a.date))[0]
}

function restingHrBaseline(): number | null {
  const vals = healthStore
    .getAll()
    .filter((h) => daysAgo(h.date) >= 1 && daysAgo(h.date) < 21 && h.restingHeartRate != null)
    .map((h) => h.restingHeartRate as number)
  if (vals.length < 3) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

/** A short coaching line from today's (or yesterday's) manual health data. */
export function healthCoachLine(): string | null {
  const h = recentHealth()
  if (!h) return null
  const parts: string[] = []

  if (h.steps != null && h.steps >= 12000)
    parts.push(`High step count (${h.steps.toLocaleString()}) — you burned extra today, so eat to match.`)
  if (h.activeCalories != null && h.activeCalories >= 700)
    parts.push(`Active burn is high (${h.activeCalories} kcal) — hydrate well and don't under-eat.`)
  if (h.sleepHours != null && h.sleepHours < 6)
    parts.push(`Only ${h.sleepHours}h sleep — favor recovery over chasing PRs today.`)

  const base = restingHrBaseline()
  if (h.restingHeartRate != null && base != null && h.restingHeartRate > base + 7)
    parts.push(
      `Resting HR is up (${h.restingHeartRate} vs ~${Math.round(base)} bpm baseline) — a sign of under-recovery; keep intensity moderate.`,
    )

  return parts.length ? parts.join(' ') : null
}
