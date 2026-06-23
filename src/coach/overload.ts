import type {
  ProgramExercise,
  WorkoutEntry,
  OverloadSuggestion,
  OverloadAction,
  Settings,
  UnitWeight,
} from '@/types'
import { toDisplayWeight, fromDisplayWeight, liftStep, roundTo } from '@/lib/format'
import { topWeight, bestSet, epley1RM } from './metrics'

const trimDisp = (v: number) => String(Number(v.toFixed(2)))

interface SuggestInput {
  exerciseId: string
  settings: Settings
  target?: ProgramExercise
  lastEntry?: WorkoutEntry | null
}

const fmt = (kg: number, s: Settings) =>
  `${roundTo(toDisplayWeight(kg, s.units.weight), s.units.weight === 'lb' ? 1 : 0.5)} ${s.units.weight}`

/**
 * Progressive-overload suggestion for the next session of one exercise.
 * Baseline = the program target (rep range + starting weight); the user's last
 * logged performance decides whether to push, hold, or back off.
 */
export function suggestOverload(input: SuggestInput): OverloadSuggestion {
  const { exerciseId, settings, target, lastEntry } = input
  const step = liftStep(settings)

  // No history yet — anchor to the program's starting weight.
  if (!lastEntry || lastEntry.sets.every((s) => s.reps === 0)) {
    const startKg = target?.startingWeight ?? 0
    return {
      exerciseId,
      action: 'none',
      suggestedWeight: startKg,
      message: startKg
        ? `Start at ${fmt(startKg, settings)}. Log a session to unlock coaching.`
        : 'Log your first session to unlock progressive-overload coaching.',
    }
  }

  const repsLow = target?.repsLow ?? 5
  const repsHigh = target?.repsHigh ?? 8
  const heaviest = topWeight(lastEntry)
  const topSets = lastEntry.sets.filter((s) => s.reps > 0 && s.weight === heaviest)
  const worstReps = topSets.length ? Math.min(...topSets.map((s) => s.reps)) : 0

  // Difficulty from RPE/RIR if available (use the hardest top set).
  const rpe = Math.max(...topSets.map((s) => s.rpe ?? 0))
  const rirVals = topSets.map((s) => s.rir).filter((v): v is number => v != null)
  const rir = rirVals.length ? Math.min(...rirVals) : null
  const wasHard = rpe >= 9.5 || rir === 0

  let action: OverloadAction
  if (worstReps < repsLow) {
    action = 'decrease'
  } else if (worstReps >= repsHigh && !wasHard) {
    action = 'increase'
  } else {
    action = 'hold'
  }

  // Compute the next weight in display units so it lands on clean numbers.
  const dispTop = roundTo(toDisplayWeight(heaviest, settings.units.weight), step)
  let nextDisp = dispTop
  if (action === 'increase') nextDisp = dispTop + step
  if (action === 'decrease') nextDisp = Math.max(0, dispTop - step)
  const suggestedWeight = fromDisplayWeight(nextDisp, settings.units.weight)

  const unit = settings.units.weight
  let message: string
  switch (action) {
    case 'increase':
      message = `Strong work — you cleared ${repsHigh} reps${wasHard ? '' : ' with room to spare'}. Move up to ${nextDisp} ${unit} next time.`
      break
    case 'decrease':
      message = `You fell short of ${repsLow} reps at ${dispTop} ${unit}. Drop to ${nextDisp} ${unit} (or cut a set) and rebuild.`
      break
    default:
      message = wasHard
        ? `That was a grind. Repeat ${dispTop} ${unit} and aim to beat your reps before adding load.`
        : `Stay at ${dispTop} ${unit} and push for ${repsHigh} clean reps to earn the jump.`
  }

  return { exerciseId, action, suggestedWeight, message }
}

// ---------------------------------------------------------------------------
// Trend-based overload — looks at the last 3–5 sessions, not just the previous
// one, and reports a confidence + reasoning.
// ---------------------------------------------------------------------------

export interface TrendSuggestion {
  action: OverloadAction
  /** suggested next working weight, kilograms */
  suggestedWeight: number
  message: string
  confidence: 'High' | 'Medium' | 'Low'
  reasoning: string
}

interface SessionSummary {
  heaviest: number
  worstReps: number
  rpe: number
  e1rm: number
}

function summarize(entry: WorkoutEntry): SessionSummary {
  const heaviest = topWeight(entry)
  const topSets = entry.sets.filter((s) => s.reps > 0 && s.weight === heaviest)
  const worstReps = topSets.length ? Math.min(...topSets.map((s) => s.reps)) : 0
  const rpe = topSets.reduce((m, s) => Math.max(m, s.rpe ?? 0), 0)
  const best = bestSet(entry)
  return { heaviest, worstReps, rpe, e1rm: best ? epley1RM(best.weight, best.reps) : 0 }
}

export function suggestOverloadTrend(input: {
  exerciseId: string
  settings: Settings
  target?: ProgramExercise
  /** chronological (oldest → newest) recent entries for this exercise */
  history: WorkoutEntry[]
}): TrendSuggestion {
  const { settings, target } = input
  const step = liftStep(settings)
  const unit = settings.units.weight
  const repsLow = target?.repsLow ?? 5
  const repsHigh = target?.repsHigh ?? 8

  const withReps = input.history.filter((e) => e.sets.some((s) => s.reps > 0)).slice(-5)
  if (withReps.length < 2) {
    const base = suggestOverload({ exerciseId: input.exerciseId, settings, target, lastEntry: withReps.at(-1) ?? null })
    return {
      action: base.action,
      suggestedWeight: base.suggestedWeight,
      message: base.message,
      confidence: 'Low',
      reasoning: 'Only one session logged — based on your last performance and program target.',
    }
  }

  const sums = withReps.map(summarize)
  const last = sums[sums.length - 1]
  const dispTop = roundTo(toDisplayWeight(last.heaviest, unit), step)

  // Consecutive recent sessions that cleared the top of the range without grinding.
  let hitStreak = 0
  for (let i = sums.length - 1; i >= 0; i--) {
    if (sums[i].worstReps >= repsHigh && sums[i].rpe < 9.5) hitStreak++
    else break
  }
  // Sessions in a row at the same top weight.
  let sameWeight = 1
  for (let i = sums.length - 2; i >= 0; i--) {
    if (Math.abs(sums[i].heaviest - last.heaviest) < 1e-6) sameWeight++
    else break
  }
  const repsImproving = last.worstReps > (sums[sums.length - 2]?.worstReps ?? 0)

  if (sums.slice(-2).every((s) => s.worstReps < repsLow)) {
    const next = Math.max(0, dispTop - step)
    return {
      action: 'decrease',
      suggestedWeight: fromDisplayWeight(next, unit),
      message: `Reps have slipped below ${repsLow} at ${dispTop} ${unit}. Drop to ${next} ${unit} and rebuild momentum.`,
      confidence: 'High',
      reasoning: `Missed the bottom of your rep range two sessions running.`,
    }
  }
  if (hitStreak >= 2) {
    const next = dispTop + step
    return {
      action: 'increase',
      suggestedWeight: fromDisplayWeight(next, unit),
      message: `${dispTop} ${unit} cleared ${repsHigh}+ reps ${hitStreak} sessions straight — move up to ${next} ${unit}.`,
      confidence: hitStreak >= 3 ? 'High' : 'Medium',
      reasoning: `Hit the top of your rep range with RPE under control for ${hitStreak} consecutive sessions.`,
    }
  }
  if (sameWeight >= 3 && !repsImproving) {
    return {
      action: 'hold',
      suggestedWeight: last.heaviest,
      message: `Performance has stalled at ${dispTop} ${unit} for ${sameWeight} sessions. Hold the weight and reduce fatigue — deload a set or two.`,
      confidence: sameWeight >= 4 ? 'High' : 'Medium',
      reasoning: `Top weight unchanged for ${sameWeight} sessions with no rep progress — likely accumulated fatigue.`,
    }
  }
  return {
    action: 'hold',
    suggestedWeight: last.heaviest,
    message: `Stay at ${dispTop} ${unit} and chase ${repsHigh} clean reps to earn the next jump.`,
    confidence: 'Medium',
    reasoning: `Reps are trending up but not yet at the top of your range.`,
  }
}

// ---------------------------------------------------------------------------
// Intra-workout, set-by-set progression cue. After each completed set this
// decides whether the NEXT set should go heavier, hold, or back off — with
// practical, equipment-aware load jumps.
// ---------------------------------------------------------------------------

/**
 * Practical load increments for the next set, in the active display unit,
 * ascending (e.g. dumbbells → [2.5, 5] lb). An empty array means the movement
 * progresses by reps, not load (bodyweight / bands).
 */
export function loadSteps(unit: UnitWeight, equipment: string | undefined): number[] {
  const e = (equipment ?? '').toLowerCase()
  const lb = unit === 'lb'
  if (e.includes('body') || e.includes('band')) return []
  if (e.includes('barbell')) return lb ? [5] : [2.5]
  if (e.includes('kettle')) return lb ? [5] : [2.5]
  // dumbbell, machine, cable, other → offer a small and a standard jump
  return lb ? [2.5, 5] : [1.25, 2.5]
}

export interface NextSetCue {
  action: 'increase' | 'hold' | 'decrease'
  message: string
  /** tappable alternative next-weights, kilograms (ascending; may be empty) */
  options: number[]
  /** weight to auto-prefill into the next set, kilograms */
  primary: number
}

/**
 * Suggestion for the next set, given the set just completed and the exercise's
 * rep-range target. Hitting the top of the range pushes load up immediately.
 */
export function nextSetCue(input: {
  settings: Settings
  equipment: string | undefined
  repsLow: number
  repsHigh: number
  /** the set just completed */
  weightKg: number
  reps: number
  rpe?: number
}): NextSetCue {
  const { settings, equipment, repsLow, repsHigh, weightKg, reps, rpe } = input
  const unit = settings.units.weight
  const steps = loadSteps(unit, equipment)
  const baseStep = steps[0] ?? liftStep(settings)
  const disp = roundTo(toDisplayWeight(weightKg, unit), baseStep)
  const hard = rpe != null && rpe >= 10

  // Hit (or beat) the top of the range → add load on the next set.
  if (reps >= repsHigh && !hard) {
    if (steps.length === 0) {
      return {
        action: 'increase',
        message: `Hit the top of your range (${reps} reps) — add a rep next set or progress to a harder variation.`,
        options: [],
        primary: weightKg,
      }
    }
    const optsDisp = steps.map((s) => disp + s)
    const options = optsDisp.map((d) => fromDisplayWeight(d, unit))
    const list = optsDisp.map((d) => `${trimDisp(d)} ${unit}`).join(' or ')
    return {
      action: 'increase',
      message: `Hit the top of your range (${reps} reps). Try ${list} for the next set.`,
      options,
      primary: options[0],
    }
  }

  // Below the bottom of the range → warn and offer a lighter option.
  if (reps > 0 && reps < repsLow) {
    if (steps.length === 0) {
      return {
        action: 'decrease',
        message: `Only ${reps} reps — short of ${repsLow}. Rest a little longer and try to match it.`,
        options: [],
        primary: weightKg,
      }
    }
    const downDisp = Math.max(0, disp - baseStep)
    return {
      action: 'decrease',
      message: `Only ${reps} reps — below your ${repsLow} target. Hold ${trimDisp(disp)} ${unit} and grind, or drop to ${trimDisp(downDisp)} ${unit}.`,
      options: [fromDisplayWeight(downDisp, unit)],
      primary: weightKg,
    }
  }

  // In range but not at the top → keep the weight and chase more reps.
  return {
    action: 'hold',
    message: `${reps} reps logged — in range. Keep ${trimDisp(disp)} ${unit} and aim for ${repsHigh}.`,
    options: [],
    primary: weightKg,
  }
}
