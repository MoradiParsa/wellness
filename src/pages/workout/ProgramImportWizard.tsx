import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { FullScreenPage } from '@/components/layout/FullScreenPage'
import { ProgramForm } from '@/components/workout/ProgramForm'
import { toast } from '@/components/ui/sonner'
import { usePrograms } from '@/hooks/usePrograms'
import { uid } from '@/lib/id'
import { nowISO } from '@/lib/date'
import type { Program } from '@/types'

export function ProgramImportWizard() {
  const navigate = useNavigate()
  const { create } = usePrograms()

  const initial = useMemo<Program>(
    () => ({
      id: uid(),
      name: '',
      createdAt: nowISO(),
      days: [{ id: uid(), name: 'Day A', order: 0, exercises: [] }],
    }),
    [],
  )

  return (
    <FullScreenPage title="Import program" noSwipe>
      <div className="mb-5 flex gap-3 rounded-2xl border border-border/80 bg-card p-4">
        <ClipboardList className="size-5 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Build your split exactly as you run it. Each exercise's sets, reps, starting weight and
          target effort become the baseline your coach uses to suggest progressive overload.
        </p>
      </div>

      <ProgramForm
        initial={initial}
        submitLabel="Save program"
        onSave={(p) => {
          create({ name: p.name, days: p.days }, true)
          toast.success('Program saved')
          navigate('/workout', { replace: true })
        }}
      />
    </FullScreenPage>
  )
}
