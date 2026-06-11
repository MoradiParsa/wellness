import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Upload, Trash2, ShieldCheck } from 'lucide-react'
import { FullScreenPage } from '@/components/layout/FullScreenPage'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { toast } from '@/components/ui/sonner'
import { exportData, importData, resetAll } from '@/data/migrate'
import { dateKey } from '@/lib/date'

export function DataManagement() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `progress-os-backup-${dateKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Backup downloaded')
  }

  const handleImport = async (file?: File) => {
    if (!file) return
    const text = await file.text()
    const res = importData(text)
    if (res.ok) {
      toast.success('Data imported')
      document.documentElement.classList.toggle('dark', true)
    } else {
      toast.error(res.error ?? 'Import failed')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <FullScreenPage title="Data">
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => handleImport(e.target.files?.[0])}
      />

      <Card className="mb-4">
        <CardContent className="space-y-1 p-2">
          <Action
            icon={<Download className="size-5" />}
            title="Export data"
            subtitle="Download a JSON backup of everything"
            onClick={handleExport}
          />
          <Action
            icon={<Upload className="size-5" />}
            title="Import data"
            subtitle="Restore from a backup file"
            onClick={() => fileRef.current?.click()}
          />
        </CardContent>
      </Card>

      <Card className="mb-4 border-success/30">
        <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" />
          <p>
            All your data lives in this browser's local storage — nothing is sent anywhere. Export
            regularly so you don't lose your history if you clear your browser.
          </p>
        </CardContent>
      </Card>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Card className="border-destructive/30">
            <CardContent className="p-2">
              <Action
                icon={<Trash2 className="size-5 text-destructive" />}
                title="Reset app"
                subtitle="Erase all data and start fresh"
                destructive
              />
            </CardContent>
          </Card>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset everything?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your program, workouts, meals, weigh-ins, and tasks. This
              can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                resetAll()
                toast.success('App reset')
                navigate('/onboarding', { replace: true })
              }}
            >
              Erase all data
            </AlertDialogAction>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FullScreenPage>
  )
}

function Action({
  icon,
  title,
  subtitle,
  onClick,
  destructive,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  onClick?: () => void
  destructive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left active:bg-secondary/60"
    >
      <span className="flex size-10 items-center justify-center rounded-xl bg-secondary">{icon}</span>
      <span className="flex-1">
        <span className={`block text-[15px] font-medium ${destructive ? 'text-destructive' : ''}`}>
          {title}
        </span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  )
}
