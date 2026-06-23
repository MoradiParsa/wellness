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
  HeartPulse,
  Camera,
  Scale,
  UtensilsCrossed,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { TabPage } from '@/components/layout/TabPage'
import { ListGroup, ListRow } from '@/components/shared/List'
import { useSettings } from '@/hooks/useSettings'

/** Main tabs that can live in the bottom bar — listed here when hidden so they stay reachable. */
const PAGE_LINKS: { key: string; icon: LucideIcon; label: string; sublabel: string; to: string }[] = [
  { key: 'workout', icon: Dumbbell, label: 'Workout', sublabel: 'Program & training', to: '/workout' },
  { key: 'nutrition', icon: UtensilsCrossed, label: 'Nutrition', sublabel: 'Food logging & macros', to: '/nutrition' },
  { key: 'weight', icon: Scale, label: 'Body Metrics', sublabel: 'Weight & body composition', to: '/weight' },
  { key: 'tasks', icon: ListChecks, label: 'Tasks & Habits', sublabel: 'Daily habits & to-dos', to: '/tasks' },
  { key: 'analytics', icon: BarChart3, label: 'Analytics', sublabel: 'Trends, records & reports', to: '/analytics' },
  { key: 'progress', icon: LineChart, label: 'Weekly Progress', sublabel: 'Weight, calories & adjustments', to: '/progress' },
  { key: 'photos', icon: Camera, label: 'Progress Photos', sublabel: 'Timeline & comparison', to: '/photos' },
]

export function MoreMenuPage() {
  const navigate = useNavigate()
  const { settings } = useSettings()

  // Any main tab not currently in the bottom bar is surfaced here so it stays reachable.
  const hiddenPages = PAGE_LINKS.filter((p) => !settings.bottomBarVisibleKeys.includes(p.key))

  return (
    <TabPage title="More" subtitle={settings.name ? `Hi, ${settings.name}` : 'Everything else'}>
      {hiddenPages.length > 0 && (
        <ListGroup title="Pages">
          {hiddenPages.map((p) => (
            <ListRow key={p.key} icon={p.icon} label={p.label} sublabel={p.sublabel} chevron onClick={() => navigate(p.to)} />
          ))}
        </ListGroup>
      )}

      <ListGroup title="Workout tools">
        <ListRow icon={ClipboardList} label="Manage program" chevron onClick={() => navigate('/workout')} />
        <ListRow icon={FileSpreadsheet} label="Import from spreadsheet" sublabel="CSV or Excel" chevron onClick={() => navigate('/workout/program/import')} />
        <ListRow icon={Dumbbell} label="Exercise library" chevron onClick={() => navigate('/workout/exercises')} />
        <ListRow icon={History} label="Workout history" chevron onClick={() => navigate('/workout/history')} />
      </ListGroup>

      <ListGroup title="App">
        <ListRow icon={HeartPulse} label="Health Import" sublabel="Steps, sleep, heart rate & recovery" chevron onClick={() => navigate('/health')} />
        <ListRow icon={SlidersHorizontal} label="Settings" chevron onClick={() => navigate('/settings')} />
        <ListRow icon={Database} label="Export / Import / Reset" chevron onClick={() => navigate('/settings/data')} />
      </ListGroup>

      <div className="flex items-center justify-center gap-2 px-1 pb-4 pt-2 text-center text-xs text-muted-foreground">
        <Sparkles className="size-3.5" />
        Offline-first · Your data stays on this device
      </div>
    </TabPage>
  )
}
