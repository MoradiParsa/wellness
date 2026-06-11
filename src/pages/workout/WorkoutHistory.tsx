import { History, Trash2 } from 'lucide-react'
import { FullScreenPage } from '@/components/layout/FullScreenPage'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/sonner'
import { useWorkouts } from '@/hooks/useWorkouts'
import { useSettings } from '@/hooks/useSettings'
import { exerciseName } from '@/hooks/useExercises'
import { entryVolume, bestSet } from '@/coach/metrics'
import { formatPretty } from '@/lib/date'
import { formatWeight, toDisplayWeight } from '@/lib/format'
import type { WorkoutSession } from '@/types'

export function WorkoutHistory() {
  const { workouts, save, remove } = useWorkouts()
  const { settings } = useSettings()

  const deleteSession = (session: WorkoutSession) => {
    remove(session.id)
    toast('Workout deleted', {
      action: { label: 'Undo', onClick: () => save(session) },
    })
  }

  if (workouts.length === 0) {
    return (
      <FullScreenPage title="History">
        <EmptyState icon={History} title="No workouts yet" description="Your logged sessions will appear here." />
      </FullScreenPage>
    )
  }

  return (
    <FullScreenPage title="History">
      <div className="space-y-3">
        {workouts.map((w) => {
          const volume = w.entries.reduce((v, e) => v + entryVolume(e), 0)
          return (
            <div key={w.id} className="rounded-3xl border border-border/80 bg-card p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{w.name}</h3>
                  <p className="text-xs text-muted-foreground">{formatPretty(w.date)}</p>
                </div>
                <button
                  onClick={() => deleteSession(w)}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground active:bg-secondary"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                <Badge variant="secondary">{w.entries.length} lifts</Badge>
                <Badge variant="outline">{formatWeight(volume, settings, 0)} volume</Badge>
                {w.durationSec ? <Badge variant="outline">{Math.round(w.durationSec / 60)} min</Badge> : null}
              </div>

              <div className="space-y-1">
                {w.entries.map((e, i) => {
                  const best = bestSet(e)
                  return (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="truncate text-muted-foreground">{exerciseName(e.exerciseId)}</span>
                      <span className="shrink-0 font-medium tabular-nums">
                        {best
                          ? `${Number(toDisplayWeight(best.weight, settings.units.weight).toFixed(1))} × ${best.reps}`
                          : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
              {w.sessionNotes && (
                <p className="mt-2 border-t border-border/60 pt-2 text-xs text-muted-foreground">{w.sessionNotes}</p>
              )}
            </div>
          )
        })}
      </div>
    </FullScreenPage>
  )
}
