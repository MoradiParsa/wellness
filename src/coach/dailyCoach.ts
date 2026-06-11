import { settingsStore, weightsStore, workoutsStore, programsStore, adjustmentsStore } from '@/data/collections'
import { computeWeightTrend, volumeWithinDays } from './metrics'
import { bulkCutCoach } from './phase'
import { suggestOverload } from './overload'
import { lastEntryForExercise } from '@/hooks/useWorkouts'
import { exerciseName } from '@/hooks/useExercises'
import { toDisplayWeight } from '@/lib/format'
import { todayKey } from '@/lib/date'

export interface DailyBrief {
  name?: string
  calories: number
  macros: { protein: number; carbs: number; fat: number; fiber: number }
  weeklyRateText: string | null
  weeklyRateValue: number | null
  workoutLabel: string
  trainedToday: boolean
  coachTitle: string
  coachBody: string
  tone: 'positive' | 'neutral' | 'warning'
}

export function buildDailyBrief(): DailyBrief {
  const s = settingsStore.get()
  const weights = [...weightsStore.getAll()].sort((a, b) => a.date.localeCompare(b.date))
  const workouts = workoutsStore.getAll()
  const program = programsStore.getById(s.activeProgramId ?? '')
  const today = todayKey()

  const trend = computeWeightTrend(weights, s.goalWeight)
  const weeklyRateValue = trend.weeklyRate
  const weeklyRateText =
    weeklyRateValue == null
      ? null
      : `${weeklyRateValue > 0 ? '+' : ''}${toDisplayWeight(weeklyRateValue, s.units.weight).toFixed(2)} ${s.units.weight}/wk`

  // Suggested workout day (next in rotation) + whether trained today.
  const trainedToday = workouts.some((w) => w.date === today)
  let suggestedDay = null as null | NonNullable<typeof program>['days'][number]
  if (program && program.days.length) {
    const days = [...program.days].sort((a, b) => a.order - b.order)
    const last = [...workouts]
      .filter((w) => w.programId === program.id && w.programDayId)
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    const lastIdx = last ? days.findIndex((d) => d.id === last.programDayId) : -1
    suggestedDay = days[lastIdx >= 0 ? (lastIdx + 1) % days.length : 0]
  }
  const workoutLabel = trainedToday ? 'Completed' : suggestedDay?.name ?? 'No program yet'

  // Coaching line: prefer a calorie adjustment made today, else the trend coach.
  const todaysAdjustment = adjustmentsStore.getAll().find((a) => a.date === today)
  const strengthTrendUp =
    workouts.length >= 2 && volumeWithinDays(workouts, 7) >= volumeWithinDays(workouts, 14) - volumeWithinDays(workouts, 7)
  const phaseCoach = bulkCutCoach(s, weights, { strengthTrendUp })

  let coachTitle = phaseCoach.title
  let coachBody = phaseCoach.body
  let tone = phaseCoach.tone
  if (todaysAdjustment) {
    coachTitle = 'Calories updated'
    coachBody = todaysAdjustment.reason
    tone = 'warning'
  }

  // Workout tip from progressive overload on the first lift of today's session.
  if (!trainedToday && suggestedDay && suggestedDay.exercises.length) {
    const pe = suggestedDay.exercises[0]
    const prev = lastEntryForExercise(pe.exerciseId)
    if (prev) {
      const sugg = suggestOverload({ exerciseId: pe.exerciseId, settings: s, target: pe, lastEntry: prev.entry })
      if (sugg.action === 'increase') {
        coachBody += ` In ${suggestedDay.name}, ${exerciseName(pe.exerciseId)}: ${sugg.message}`
      }
    }
  }

  return {
    name: s.name,
    calories: s.calorieTarget,
    macros: { protein: s.proteinTarget, carbs: s.carbTarget, fat: s.fatTarget, fiber: s.fiberTarget },
    weeklyRateText,
    weeklyRateValue,
    workoutLabel,
    trainedToday,
    coachTitle,
    coachBody,
    tone,
  }
}
