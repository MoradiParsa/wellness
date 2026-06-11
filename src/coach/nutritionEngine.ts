import type { Settings, Profile, Phase, CalorieAdjustment } from '@/types'
import { ACTIVITY_LEVELS } from '@/lib/constants'
import { settingsStore, weightsStore, adjustmentsStore } from '@/data/collections'
import { uid } from '@/lib/id'
import { todayKey, daysAgo } from '@/lib/date'
import { kgToLb, toDisplayWeight, clamp } from '@/lib/format'

const KCAL_PER_KG = 7700 // ~3500 kcal per lb

// ---------------------------------------------------------------------------
// Maintenance (TDEE)
// ---------------------------------------------------------------------------

/** Mifflin–St Jeor basal metabolic rate (kcal/day). */
export function mifflinBMR(profile: Profile, weightKg: number): number {
  const base = 10 * weightKg + 6.25 * profile.heightCm - 5 * profile.age
  return base + (profile.sex === 'male' ? 5 : -161)
}

export function activityMultiplier(profile: Profile): number {
  return ACTIVITY_LEVELS.find((a) => a.value === profile.activityLevel)?.multiplier ?? 1.55
}

export function estimateTDEE(profile: Profile, weightKg: number): number {
  return Math.round(mifflinBMR(profile, weightKg) * activityMultiplier(profile))
}

// ---------------------------------------------------------------------------
// Target calories from goal + desired rate
// ---------------------------------------------------------------------------

function signedRate(phase: Phase, rateKg: number): number {
  if (phase === 'bulk') return Math.abs(rateKg)
  if (phase === 'cut') return -Math.abs(rateKg)
  return 0
}

export function targetCalories(tdee: number, bmr: number, phase: Phase, rateKg: number): number {
  const dailyDelta = (signedRate(phase, rateKg) * KCAL_PER_KG) / 7
  const raw = Math.round(tdee + dailyDelta)
  // Never let a cut drop below a safe floor; keep bulks sane.
  const floor = Math.max(1200, Math.round(bmr * 1.05))
  const ceil = tdee + 1200
  return Math.round(clamp(raw, floor, ceil) / 10) * 10
}

// ---------------------------------------------------------------------------
// Smart macros
// ---------------------------------------------------------------------------

const PROTEIN_PER_LB: Record<Phase, number> = { bulk: 0.9, cut: 1.1, maintain: 1.0 }

export interface Macros {
  protein: number
  carbs: number
  fat: number
  fiber: number
}

export function computeMacros(calories: number, weightKg: number, phase: Phase): Macros {
  const lb = kgToLb(weightKg)
  const protein = Math.round(clamp(PROTEIN_PER_LB[phase] * lb, 0.7 * lb, 1.3 * lb))
  const fat = Math.max(Math.round((0.25 * calories) / 9), Math.round(0.3 * lb))
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4))
  const fiber = Math.round((calories / 1000) * 14)
  return { protein, carbs, fat, fiber }
}

// ---------------------------------------------------------------------------
// Plan assembly + rationale
// ---------------------------------------------------------------------------

export interface NutritionPlan {
  bmr: number
  tdee: number
  calories: number
  macros: Macros
  caloriesRationale: string
  macrosRationale: string
}

export function currentWeightKg(): number {
  const ws = weightsStore.getAll()
  if (ws.length) return [...ws].sort((a, b) => b.date.localeCompare(a.date))[0].weight
  return settingsStore.get().goalWeight
}

export function buildPlan(settings: Settings, weightKg = currentWeightKg()): NutritionPlan {
  const { profile, phase } = settings
  const bmr = Math.round(mifflinBMR(profile, weightKg))
  const tdee = estimateTDEE(profile, weightKg)
  const calories = settings.autoCalories
    ? targetCalories(tdee, bmr, phase, profile.desiredRateKg)
    : settings.calorieTarget
  const macros = settings.autoMacros
    ? computeMacros(calories, weightKg, phase)
    : { protein: settings.proteinTarget, carbs: settings.carbTarget, fat: settings.fatTarget, fiber: settings.fiberTarget }

  const rateDisp = toDisplayWeight(profile.desiredRateKg, settings.units.weight).toFixed(2)
  const surplus = calories - tdee
  const dir = phase === 'bulk' ? 'surplus' : phase === 'cut' ? 'deficit' : 'maintenance'
  const caloriesRationale =
    `Your BMR is ~${bmr} kcal. With your activity that's a maintenance (TDEE) of ~${tdee} kcal/day. ` +
    (phase === 'maintain'
      ? `To hold steady we set calories at maintenance.`
      : `To ${phase === 'bulk' ? 'gain' : 'lose'} about ${rateDisp} ${settings.units.weight}/week we apply a ${Math.abs(surplus)} kcal ${dir}, giving ${calories} kcal/day.`)

  const macrosRationale =
    `Protein ${macros.protein}g (~${PROTEIN_PER_LB[phase]}g per lb of body weight) to ${phase === 'cut' ? 'protect muscle in a deficit' : 'support growth'}, ` +
    `fat ${macros.fat}g (~25% of calories) for hormones, and the remaining ${macros.carbs}g carbs fuel training. Fiber target ${macros.fiber}g.`

  return { bmr, tdee, calories, macros, caloriesRationale, macrosRationale }
}

/** Recompute the plan and write the targets into Settings (respects auto flags). */
export function applyAutoPlan(opts: { resetWeeklyBaseline?: boolean } = {}): NutritionPlan {
  const settings = settingsStore.get()
  const plan = buildPlan(settings)
  settingsStore.set({
    estimatedTDEE: plan.tdee,
    ...(settings.autoCalories ? { calorieTarget: plan.calories } : {}),
    ...(settings.autoMacros
      ? {
          proteinTarget: plan.macros.protein,
          carbTarget: plan.macros.carbs,
          fatTarget: plan.macros.fat,
          fiberTarget: plan.macros.fiber,
        }
      : {}),
    ...(opts.resetWeeklyBaseline ? { lastWeeklyAdjust: todayKey() } : {}),
  })
  return plan
}

// ---------------------------------------------------------------------------
// Weekly auto-adjustment
// ---------------------------------------------------------------------------

function avgWindow(lo: number, hi: number): number | null {
  const ws = weightsStore.getAll().filter((w) => daysAgo(w.date) >= lo && daysAgo(w.date) < hi)
  if (ws.length === 0) return null
  return ws.reduce((s, w) => s + w.weight, 0) / ws.length
}

/**
 * Runs at most once per week. Compares the 7-day average weight change against
 * the expected rate and nudges calories by 100–200 kcal, logging the reason.
 * Returns the adjustment if one was made.
 */
export function maybeWeeklyAdjust(): CalorieAdjustment | null {
  const s = settingsStore.get()
  if (!s.autoCalories) return null

  // Wait at least 7 days between adjustments.
  if (s.lastWeeklyAdjust && daysAgo(s.lastWeeklyAdjust) < 7) return null

  const avgRecent = avgWindow(0, 7)
  const avgPrior = avgWindow(7, 14)
  if (avgRecent == null || avgPrior == null) {
    // Not enough history yet — seed the baseline so the timer starts.
    if (!s.lastWeeklyAdjust) settingsStore.set({ lastWeeklyAdjust: todayKey() })
    return null
  }

  const actual = avgRecent - avgPrior // kg/week
  const expected = signedRate(s.phase, s.profile.desiredRateKg)
  const diff = actual - expected
  const tolerance = Math.max(0.1, 0.3 * Math.abs(expected))

  // On pace — reset the timer, no calorie change.
  if (Math.abs(diff) <= tolerance) {
    settingsStore.set({ lastWeeklyAdjust: todayKey() })
    return null
  }

  const magnitude = Math.abs(diff) > tolerance * 2 ? 200 : 100
  const direction = actual < expected ? 1 : -1 // under expected → eat more
  const bmr = Math.round(mifflinBMR(s.profile, currentWeightKg()))
  const floor = Math.max(1200, Math.round(bmr * 1.05))
  const ceil = s.estimatedTDEE + 1200
  const from = s.calorieTarget
  const to = Math.round(clamp(from + direction * magnitude, floor, ceil) / 10) * 10

  if (to === from) {
    settingsStore.set({ lastWeeklyAdjust: todayKey() })
    return null
  }

  const unit = s.units.weight
  const actualDisp = toDisplayWeight(actual, unit).toFixed(2)
  const expectedDisp = toDisplayWeight(expected, unit).toFixed(2)
  const reason =
    `Your 7-day average weight changed ${actualDisp} ${unit}/wk vs the ${expectedDisp} ${unit}/wk target. ` +
    `Daily calories ${to > from ? 'increased' : 'decreased'} from ${from} to ${to}.`

  // Apply: update calories, recompute macros, reset timer, log.
  const macros = s.autoMacros ? computeMacros(to, currentWeightKg(), s.phase) : null
  settingsStore.set({
    calorieTarget: to,
    lastWeeklyAdjust: todayKey(),
    ...(macros
      ? { proteinTarget: macros.protein, carbTarget: macros.carbs, fatTarget: macros.fat, fiberTarget: macros.fiber }
      : {}),
  })

  const adjustment: CalorieAdjustment = {
    id: uid(),
    date: todayKey(),
    fromCalories: from,
    toCalories: to,
    expectedRate: expected,
    actualRate: actual,
    reason,
  }
  adjustmentsStore.add(adjustment)
  return adjustment
}
