import type {
  ProgramExercise,
  WorkoutEntry,
  OverloadSuggestion,
  OverloadAction,
  Settings,
} from '@/types'
import { toDisplayWeight, fromDisplayWeight, liftStep, roundTo } from '@/lib/format'
import { topWeight } from './metrics'

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
