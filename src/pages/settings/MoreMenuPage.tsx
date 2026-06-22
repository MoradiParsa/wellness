import { useNavigate } from 'react-router-dom'
import {
  ListChecks,
  BarChart3,
  LineChart,
  SlidersHorizontal,
  Dumbbell,
  ClipboardList,
  History,
  Database,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react'
import { TabPage } from '@/components/layout/TabPage'
import { ListGroup, ListRow } from '@/components/shared/List'
import { useSettings } from '@/hooks/useSettings'

export function MoreMenuPage() {
  const navigate = useNavigate()
  const { settings } = useSettings()

  return (
    <TabPage title="More" subtitle={settings.name ? `Hi, ${settings.name}` : 'Everything else'}>
      <ListGroup>
        <ListRow icon={LineChart} label="Weekly Progress" sublabel="Weight, calories & adjustments" chevron onClick={() => navigate('/progress')} />
        <ListRow icon={ListChecks} label="Tasks & Habits" chevron onClick={() => navigate('/tasks')} />
        <ListRow icon={BarChart3} label="Analytics" chevron onClick={() => navigate('/analytics')} />
        <ListRow icon={SlidersHorizontal} label="Settings" chevron onClick={() => navigate('/settings')} />
      </ListGroup>

      <ListGroup title="Workout">
        <ListRow icon={ClipboardList} label="Manage program" chevron onClick={() => navigate('/workout')} />
        <ListRow icon={FileSpreadsheet} label="Import from spreadsheet" sublabel="CSV or Excel" chevron onClick={() => navigate('/workout/program/import')} />
        <ListRow icon={Dumbbell} label="Exercise library" chevron onClick={() => navigate('/workout/exercises')} />
        <ListRow icon={History} label="Workout history" chevron onClick={() => navigate('/workout/history')} />
      </ListGroup>

      <ListGroup title="Data">
        <ListRow icon={Database} label="Export / Import / Reset" chevron onClick={() => navigate('/settings/data')} />
      </ListGroup>

      <div className="flex items-center justify-center gap-2 px-1 pb-4 pt-2 text-center text-xs text-muted-foreground">
        <Sparkles className="size-3.5" />
        Offline-first · Your data stays on this device
      </div>
    </TabPage>
  )
}
