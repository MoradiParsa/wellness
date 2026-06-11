import { useParams, useNavigate } from 'react-router-dom'
import { ClipboardX } from 'lucide-react'
import { FullScreenPage } from '@/components/layout/FullScreenPage'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { ProgramForm } from '@/components/workout/ProgramForm'
import { toast } from '@/components/ui/sonner'
import { usePrograms } from '@/hooks/usePrograms'

export function ProgramEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getById, save } = usePrograms()
  const program = id ? getById(id) : undefined

  if (!program) {
    return (
      <FullScreenPage title="Program">
        <EmptyState
          icon={ClipboardX}
          title="Program not found"
          action={<Button onClick={() => navigate('/workout')}>Back to Workout</Button>}
        />
      </FullScreenPage>
    )
  }

  return (
    <FullScreenPage title="Edit program" noSwipe>
      <ProgramForm
        initial={program}
        submitLabel="Save changes"
        onSave={(p) => {
          save(p)
          toast.success('Program updated')
          navigate(-1)
        }}
      />
    </FullScreenPage>
  )
}
