import { useSingleton } from '@/data/store'
import { activeSessionStore, EMPTY_ACTIVE_SESSION } from '@/data/collections'
import { uid } from '@/lib/id'
import type { ActiveDraftEntry, ActiveSessionDraft, ProgramExercise, SetLog } from '@/types'

const DEFAULT_REST_SEC = 120

/** A fresh, empty set pre-filled with the given weight (kg) + program targets. */
export function blankSet(weight = 0, target?: ProgramExercise): SetLog {
  return {
    id: uid(),
    weight,
    reps: 0,
    completed: false,
    restSec: target?.restSec,
    tempo: target?.tempo,
    rpe: undefined,
    rir: undefined,
  }
}

const getDraft = () => activeSessionStore.get()

/** Mutate the draft immutably (deep-cloned so set/entry edits are safe). */
function mutate(fn: (d: ActiveSessionDraft) => void) {
  const d: ActiveSessionDraft = structuredClone(getDraft())
  fn(d)
  activeSessionStore.replace(d)
}

// ---- lifecycle -------------------------------------------------------------

export function startSession(input: {
  name: string
  programId?: string
  programDayId?: string
  entries: ActiveDraftEntry[]
}) {
  activeSessionStore.replace({
    ...EMPTY_ACTIVE_SESSION,
    active: true,
    startedAt: Date.now(),
    name: input.name,
    programId: input.programId,
    programDayId: input.programDayId,
    entries: input.entries,
  })
}

export function discardSession() {
  activeSessionStore.replace({ ...EMPTY_ACTIVE_SESSION })
}

// ---- exercise / set editing ------------------------------------------------

export function setCurrentIndex(i: number) {
  mutate((d) => {
    d.currentIndex = Math.max(0, Math.min(i, d.entries.length - 1))
  })
}

export function patchSet(ei: number, si: number, patch: Partial<SetLog>) {
  mutate((d) => {
    const set = d.entries[ei]?.sets[si]
    if (set) Object.assign(set, patch)
  })
}

/**
 * Mark the set complete, kick off the rest timer, and pre-fill the next set's
 * weight. Flags an auto-advance when this completes the exercise.
 */
export function logSet(ei: number, si: number, restSec: number, prefillNextKg?: number) {
  mutate((d) => {
    const entry = d.entries[ei]
    if (!entry) return
    const set = entry.sets[si]
    if (!set) return
    set.completed = true
    const next = entry.sets[si + 1]
    if (next && !next.completed && prefillNextKg != null) next.weight = prefillNextKg
    const complete = entry.sets.length > 0 && entry.sets.every((s) => s.completed)
    const rest = restSec > 0 ? restSec : DEFAULT_REST_SEC
    d.restEndsAt = Date.now() + rest * 1000
    d.restTotalSec = rest
    d.advanceAfterRest = complete
  })
}

/** Re-open a completed set for editing (makes it the current set again). */
export function reopenSet(ei: number, si: number) {
  mutate((d) => {
    const set = d.entries[ei]?.sets[si]
    if (set) set.completed = false
  })
}

export function addSet(ei: number, weightKg: number) {
  mutate((d) => {
    const entry = d.entries[ei]
    if (entry) entry.sets.push(blankSet(weightKg, entry.target))
  })
}

export function removeSet(ei: number, si: number) {
  mutate((d) => {
    const entry = d.entries[ei]
    if (entry && entry.sets.length > 1) entry.sets.splice(si, 1)
  })
}

export function addExtraExercise(exerciseId: string, weightKg: number) {
  mutate((d) => {
    d.entries.push({ exerciseId, sets: [blankSet(weightKg)], extra: true })
    d.currentIndex = d.entries.length - 1
  })
}

export function removeEntry(ei: number) {
  mutate((d) => {
    d.entries.splice(ei, 1)
    d.currentIndex = Math.max(0, Math.min(d.currentIndex, d.entries.length - 1))
  })
}

export function setSessionNotes(notes: string) {
  mutate((d) => {
    d.sessionNotes = notes
  })
}

// ---- rest timer ------------------------------------------------------------

export function startRest(sec: number) {
  mutate((d) => {
    d.restEndsAt = Date.now() + sec * 1000
    d.restTotalSec = sec
    d.advanceAfterRest = false
  })
}

export function extendRest(ms: number) {
  mutate((d) => {
    d.restEndsAt = (d.restEndsAt ?? Date.now()) + ms
  })
}

export function cancelRest() {
  mutate((d) => {
    d.restEndsAt = null
    d.restTotalSec = null
    d.advanceAfterRest = false
  })
}

// ---- derived helpers -------------------------------------------------------

export function isEntryComplete(entry: ActiveDraftEntry): boolean {
  return entry.sets.length > 0 && entry.sets.every((s) => s.completed)
}

/** First not-yet-complete exercise after `from`, wrapping to the start; null if all done. */
export function nextIncompleteIndex(
  entries: ActiveDraftEntry[],
  from: number,
): number | null {
  for (let i = from + 1; i < entries.length; i++) {
    if (!isEntryComplete(entries[i])) return i
  }
  for (let i = 0; i <= from && i < entries.length; i++) {
    if (!isEntryComplete(entries[i])) return i
  }
  return null
}

export function useActiveWorkout() {
  return useSingleton(activeSessionStore)
}
