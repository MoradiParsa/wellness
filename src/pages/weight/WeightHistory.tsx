import { useNavigate } from 'react-router-dom'
import { Scale, Trash2, Moon, Sun } from 'lucide-react'
import { FullScreenPage } from '@/components/layout/FullScreenPage'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/sonner'
import { useWeight } from '@/hooks/useWeight'
import { useSettings } from '@/hooks/useSettings'
import { formatPretty } from '@/lib/date'
import { formatWeight } from '@/lib/format'
import type { WeightEntry } from '@/types'

export function WeightHistory() {
  const navigate = useNavigate()
  const { entries, save, remove } = useWeight()
  const { settings } = useSettings()

  const del = (entry: WeightEntry) => {
    remove(entry.id)
    toast('Weigh-in deleted', { action: { label: 'Undo', onClick: () => save(entry) } })
  }

  if (entries.length === 0) {
    return (
      <FullScreenPage title="Weight history">
        <EmptyState icon={Scale} title="No weigh-ins yet" description="Your logged weights appear here." />
      </FullScreenPage>
    )
  }

  return (
    <FullScreenPage title="Weight history">
      <div className="space-y-2">
        {entries.map((e) => (
          <div key={e.id} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3">
            {e.photo ? (
              <img src={e.photo} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-secondary">
                {e.timeOfDay === 'morning' ? <Sun className="size-5" /> : <Moon className="size-5" />}
              </span>
            )}
            <button onClick={() => navigate(`/weight/${e.id}`)} className="min-w-0 flex-1 text-left">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold tabular-nums">{formatWeight(e.weight, settings)}</span>
                {e.fasted && <Badge variant="outline">Fasted</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatPretty(e.date)}
                {e.bodyFat != null && ` · ${e.bodyFat}% BF`}
                {e.muscle != null && ` · ${e.muscle}% muscle`}
              </p>
            </button>
            <button onClick={() => del(e)} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground active:bg-secondary">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </FullScreenPage>
  )
}
