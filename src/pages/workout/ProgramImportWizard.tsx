import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, FileSpreadsheet, ChevronRight } from 'lucide-react'
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
      <button
        onClick={() => navigate('/workout/program/import')}
        className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-border/80 bg-card p-4 text-left active:bg-secondary/50"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
          <FileSpreadsheet className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">Import from a spreadsheet</span>
          <span className="block text-xs text-muted-foreground">
            Upload a CSV or Excel file and review before saving
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </button>

      <div className="mb-5 flex gap-3 rounded-2xl border border-border/80 bg-card p-4">
        <ClipboardList className="size-5 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Or build your split by hand. Each exercise's sets, reps, starting weight and
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
