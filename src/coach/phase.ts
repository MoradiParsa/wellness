import type { Settings, WeightEntry, CoachMessage } from '@/types'
import { toDisplayWeight } from '@/lib/format'
import { computeWeightTrend, calculateBodyComposition } from './metrics'
import { uid } from '@/lib/id'

function rateLabel(weeklyRateKg: number, s: Settings): string {
  const v = toDisplayWeight(weeklyRateKg, s.units.weight)
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(1)} ${s.units.weight}/wk`
}

/**
 * Bulk / cut / maintain coaching from the body-weight trend, with a
 * recomposition note when strength climbs while weight holds steady.
 */
export function bulkCutCoach(
  settings: Settings,
  entries: WeightEntry[],
  opts: { strengthTrendUp: boolean } = { strengthTrendUp: false },
): CoachMessage {
  const trend = computeWeightTrend(entries, settings.goalWeight)
  const rate = trend.weeklyRate
  const phase = settings.phase

  if (rate == null) {
    return {
      id: uid(),
      title: 'Keep logging',
      body: 'Log a few more weigh-ins (ideally daily, fasted) so the coach can read your trend.',
      tone: 'neutral',
    }
  }

  const label = rateLabel(rate, settings)

  // Body composition check if available
  const latest = entries.length > 0 ? entries[entries.length - 1] : null
  const prevLatestIdx = entries.length >= 2 ? entries.length - 2 : -1
  const prev = prevLatestIdx >= 0 ? entries[prevLatestIdx] : null

  const hasBodyComp = latest && (latest.bodyFat || latest.muscle || latest.water)
  let bodyCompMsg = ''
  if (hasBodyComp && prev && (prev.bodyFat || prev.muscle)) {
    const latestComp = calculateBodyComposition(latest)
    const prevComp = calculateBodyComposition(prev)
    const fatDelta = latestComp.fatMassKg - prevComp.fatMassKg
    const muscleDelta = latestComp.muscleMassKg - prevComp.muscleMassKg

    if (phase === 'bulk' && Math.abs(rate) > 0.15) {
      if (fatDelta > muscleDelta * 1.5) {
        bodyCompMsg = 'Fat mass climbing faster than muscle — slow the bulk slightly.'
      } else if (latestComp.fatMassKg <= prevComp.fatMassKg && muscleDelta > 0) {
        bodyCompMsg = 'Great bulk signal: scale weight is rising without fat mass increasing.'
      } else if (muscleDelta > 0) {
        bodyCompMsg = 'Muscle mass trending up — keep calories steady.'
      }
    }
    if (phase === 'cut' && Math.abs(rate) > 0.1) {
      if (muscleDelta < 0 && Math.abs(muscleDelta) > Math.abs(fatDelta)) {
        bodyCompMsg = 'Losing muscle faster than fat — add ~100 kcal/day and keep protein high.'
      } else if (fatDelta > 0 && rate < -0.5) {
        bodyCompMsg = 'Fat mass should be dropping. Your deficit may be too aggressive.'
      }
    }
  }

  // Recomposition: weight roughly stable but strength rising.
  if (opts.strengthTrendUp && Math.abs(rate) < 0.15) {
    return {
      id: uid(),
      title: 'Body recomposition',
      body: `Your weight is holding (${label}) while your lifts climb — you're recomposing: building muscle and losing fat at once. Hold the course.`,
      tone: 'positive',
    }
  }

  if (phase === 'bulk') {
    if (rate < 0.1) {
      return {
        id: uid(),
        title: 'Bulk has stalled',
        body: `Your weight is flat (${label}) over the last couple of weeks. Add ~200 kcal/day (mostly carbs) to get the scale moving again.`,
        tone: 'warning',
      }
    }
    if (rate > 0.6) {
      const msg = bodyCompMsg || `You're up ${label} — faster than ideal for a lean bulk. Trim ~150 kcal/day to keep more of the gains as muscle.`
      return {
        id: uid(),
        title: 'Gaining too fast',
        body: msg,
        tone: 'warning',
      }
    }
    const msg = bodyCompMsg || `Climbing at ${label} — right in the sweet spot for a controlled bulk. Keep calories where they are.`
    return {
      id: uid(),
      title: 'Bulk is working',
      body: msg,
      tone: 'positive',
    }
  }

  if (phase === 'cut') {
    if (rate > -0.1) {
      return {
        id: uid(),
        title: 'Cut has stalled',
        body: `The scale isn't moving (${label}). Drop ~150–200 kcal/day or add steps to restart fat loss.`,
        tone: 'warning',
      }
    }
    if (rate < -1.0) {
      return {
        id: uid(),
        title: 'Losing too fast',
        body: `Down ${label} — fast enough to risk muscle. Add ~150 kcal/day and keep protein high.`,
        tone: 'warning',
      }
    }
    return {
      id: uid(),
      title: 'Cut is on track',
      body: `Losing ${label} — a sustainable pace that protects muscle. Stay the course.`,
      tone: 'positive',
    }
  }

  // maintain
  if (Math.abs(rate) > 0.3) {
    return {
      id: uid(),
      title: 'Drifting from maintenance',
      body: `You're trending ${label}. Nudge calories ${rate > 0 ? 'down' : 'up'} by ~150/day to hold steady.`,
      tone: 'warning',
    }
  }
  return {
    id: uid(),
    title: 'Holding steady',
    body: `Weight is stable (${label}) — maintenance dialed in. Great time to focus on performance.`,
    tone: 'positive',
  }
}
