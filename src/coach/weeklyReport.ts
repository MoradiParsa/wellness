// ============================================================================
// Weekly reports — auto-generated summaries of weight, composition, nutrition,
// training, sleep, steps and recovery, with a phase-aware assessment line.
// Generated for the previous (completed) week and stored historically.
// ============================================================================

import type { Settings, WeeklyReport, WeightEntry } from '@/types'
import {
  weightsStore,
  mealsStore,
  workoutsStore,
  healthStore,
  settingsStore,
  weeklyReportsStore,
} from '@/data/collections'
import { weekStartKey, parseKey, addDaysKey, nowISO } from '@/lib/date'
import { kgToLb } from '@/lib/format'
import { recoverySeries } from './recovery'

const inWeek = (dateKey: string, weekStart: string) =>
  weekStartKey(parseKey(dateKey)) === weekStart
const avg = (nums: number[]): number | null =>
  nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null

function weekAvg(weekStart: string, field: 'weight' | 'bodyFat' | 'muscle'): number | null {
  const vals = weightsStore
    .getAll()
    .filter((w) => inWeek(w.date, weekStart) && w[field as keyof WeightEntry] != null)
    .map((w) => w[field as keyof WeightEntry] as number)
  return avg(vals)
}

interface AssessInput {
  weightDeltaKg: number | null
  bodyFatDelta: number | null
  avgProtein: number | null
  workoutsCompleted: number
  workoutsPlanned: number
}

function assess(s: Settings, r: AssessInput): string {
  if (r.weightDeltaKg == null) return 'Not enough weigh-ins this week to assess the trend — log a few more.'
  const lbWk = kgToLb(r.weightDeltaKg)
  const dir = lbWk > 0.1 ? 'gain' : lbWk < -0.1 ? 'loss' : 'flat'
  const bfUp = r.bodyFatDelta != null && r.bodyFatDelta > 0.2
  const bfStable = r.bodyFatDelta == null || Math.abs(r.bodyFatDelta) <= 0.2
  const proteinLow = r.avgProtein != null && s.proteinTarget > 0 && r.avgProtein < s.proteinTarget * 0.85

  let msg: string
  if (s.phase === 'bulk') {
    if (dir === 'gain' && lbWk <= 0.7 && bfStable)
      msg = 'Excellent lean bulk week — weight gain is on target and body fat stayed stable.'
    else if (dir === 'gain') msg = `Solid gains, but a touch fast${bfUp ? ' and body fat ticked up' : ''}. Consider trimming ~150 kcal to stay lean.`
    else if (dir === 'flat') msg = 'Weight held flat this week. If strength also stalled, add ~150–200 kcal to restart the bulk.'
    else msg = 'You lost weight on a bulk — bump calories up to get back on track.'
  } else if (s.phase === 'cut') {
    if (dir === 'loss') msg = 'Good cutting week — fat loss is moving. Keep protein high to protect muscle.'
    else if (dir === 'flat') msg = 'The cut stalled this week. Tighten intake a little or add daily steps.'
    else msg = 'Weight rose during a cut — review this week’s intake.'
  } else {
    msg = Math.abs(lbWk) < 0.3 ? 'Maintenance is dialed in — weight held steady.' : 'You drifted from maintenance this week; nudge calories the other way.'
  }

  if (r.workoutsPlanned > 0 && r.workoutsCompleted < r.workoutsPlanned)
    msg += ` You hit ${r.workoutsCompleted}/${r.workoutsPlanned} planned sessions.`
  if (proteinLow) msg += ' Protein ran low — make that the first fix next week.'
  return msg
}

export function buildWeeklyReport(weekStart: string): WeeklyReport {
  const prev = addDaysKey(weekStart, -7)
  const s = settingsStore.get()

  const wThis = weekAvg(weekStart, 'weight')
  const wPrev = weekAvg(prev, 'weight')
  const bfThis = weekAvg(weekStart, 'bodyFat')
  const bfPrev = weekAvg(prev, 'bodyFat')
  const muThis = weekAvg(weekStart, 'muscle')
  const muPrev = weekAvg(prev, 'muscle')

  const calByDay = new Map<string, number>()
  const proByDay = new Map<string, number>()
  for (const m of mealsStore.getAll()) {
    if (!inWeek(m.date, weekStart)) continue
    calByDay.set(m.date, (calByDay.get(m.date) ?? 0) + m.calories)
    proByDay.set(m.date, (proByDay.get(m.date) ?? 0) + m.protein)
  }
  const avgCalories = calByDay.size ? Math.round(avg([...calByDay.values()])!) : null
  const avgProtein = proByDay.size ? Math.round(avg([...proByDay.values()])!) : null

  const workoutsCompleted = new Set(
    workoutsStore.getAll().filter((w) => inWeek(w.date, weekStart)).map((w) => w.date),
  ).size
  const workoutsPlanned = s.profile.trainingDaysPerWeek || 0

  const sleeps = healthStore.getAll().filter((h) => inWeek(h.date, weekStart) && h.sleepHours != null).map((h) => h.sleepHours as number)
  const steps = healthStore.getAll().filter((h) => inWeek(h.date, weekStart) && h.steps != null).map((h) => h.steps as number)
  const avgSleep = sleeps.length ? Math.round(avg(sleeps)! * 10) / 10 : null
  const avgSteps = steps.length ? Math.round(avg(steps)!) : null

  const recScores = recoverySeries(60).filter((r) => inWeek(r.date, weekStart)).map((r) => r.score)
  const avgRecovery = recScores.length ? Math.round(avg(recScores)!) : null

  const weightDeltaKg = wThis != null && wPrev != null ? wThis - wPrev : null
  const bodyFatDelta = bfThis != null && bfPrev != null ? Math.round((bfThis - bfPrev) * 10) / 10 : null
  const muscleDelta = muThis != null && muPrev != null ? Math.round((muThis - muPrev) * 10) / 10 : null

  return {
    id: weekStart,
    weekStart,
    weightDeltaKg,
    bodyFatDelta,
    muscleDelta,
    avgCalories,
    avgProtein,
    workoutsCompleted,
    workoutsPlanned,
    avgSleep,
    avgSteps,
    avgRecovery,
    assessment: assess(s, { weightDeltaKg, bodyFatDelta, avgProtein, workoutsCompleted, workoutsPlanned }),
    createdAt: nowISO(),
  }
}

/** Live (unsaved) report for the current, in-progress week. */
export function currentWeekReport(): WeeklyReport {
  return buildWeeklyReport(weekStartKey())
}

/** Generate & store last week's report once, if there is data for it. */
export function maybeGenerateWeeklyReport(): WeeklyReport | null {
  const lastWeek = addDaysKey(weekStartKey(), -7)
  if (weeklyReportsStore.getById(lastWeek)) return null
  const hasData =
    weightsStore.getAll().some((w) => inWeek(w.date, lastWeek)) ||
    mealsStore.getAll().some((m) => inWeek(m.date, lastWeek)) ||
    workoutsStore.getAll().some((w) => inWeek(w.date, lastWeek))
  if (!hasData) return null
  const report = buildWeeklyReport(lastWeek)
  weeklyReportsStore.add(report)
  return report
}
