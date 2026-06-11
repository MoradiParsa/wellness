import { useState } from 'react'
import { Plus, Check, Repeat, ListChecks } from 'lucide-react'
import { TabPage } from '@/components/layout/TabPage'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { TaskSheet } from '@/components/tasks/TaskSheet'
import { useTasks, filterTasks, type TaskFilter } from '@/hooks/useTasks'
import { TASK_CATEGORIES } from '@/lib/constants'
import { formatRelativeDue } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { Task, TaskCategory } from '@/types'

const FILTERS: { value: TaskFilter; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'completed', label: 'Done' },
]

const priorityColor: Record<Task['priority'], string> = {
  high: 'bg-destructive',
  medium: 'bg-warning',
  low: 'bg-muted-foreground/50',
}

export function TaskList() {
  const { tasks, toggleComplete } = useTasks()
  const [filter, setFilter] = useState<TaskFilter>('today')
  const [category, setCategory] = useState<TaskCategory | 'all'>('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Task | undefined>(undefined)

  let list = filterTasks(tasks, filter)
  if (category !== 'all') list = list.filter((t) => t.category === category)

  const openNew = () => {
    setEditing(undefined)
    setSheetOpen(true)
  }
  const openEdit = (task: Task) => {
    setEditing(task)
    setSheetOpen(true)
  }

  const catColor = (c: TaskCategory) => TASK_CATEGORIES.find((x) => x.value === c)?.color ?? 'currentColor'

  return (
    <TabPage
      title="Tasks"
      right={
        <Button size="iconSm" variant="secondary" onClick={openNew}>
          <Plus />
        </Button>
      }
    >
      <SegmentedControl
        className="mb-3"
        layoutId="task-filter"
        size="sm"
        value={filter}
        onChange={setFilter}
        options={FILTERS}
      />

      <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 no-scrollbar">
        <Chip active={category === 'all'} onClick={() => setCategory('all')}>
          All
        </Chip>
        {TASK_CATEGORIES.map((c) => (
          <Chip key={c.value} active={category === c.value} onClick={() => setCategory(c.value)}>
            {c.label}
          </Chip>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nothing here"
          description={filter === 'completed' ? 'Completed tasks will show up here.' : 'Add a task to stay on track.'}
          action={filter !== 'completed' ? <Button onClick={openNew}><Plus className="size-4" /> New task</Button> : undefined}
        />
      ) : (
        <div className="space-y-2">
          {list.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3"
            >
              <button
                onClick={() => toggleComplete(task.id)}
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  task.completed ? 'border-success bg-success text-success-foreground' : 'border-muted-foreground/40',
                )}
              >
                {task.completed && <Check className="size-4" />}
              </button>
              <button onClick={() => openEdit(task)} className="min-w-0 flex-1 text-left">
                <span className={cn('flex items-center gap-1.5 truncate font-medium', task.completed && 'text-muted-foreground line-through')}>
                  <span className={cn('size-2 shrink-0 rounded-full', priorityColor[task.priority])} />
                  <span className="truncate">{task.title}</span>
                  {task.recurrence !== 'none' && <Repeat className="size-3 shrink-0 text-muted-foreground" />}
                </span>
                <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span style={{ color: catColor(task.category) }} className="capitalize">{task.category}</span>
                  {task.dueDate && <span>· {formatRelativeDue(task.dueDate)}</span>}
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      <TaskSheet open={sheetOpen} onOpenChange={setSheetOpen} task={editing} />
    </TabPage>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
        active ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground',
      )}
    >
      {children}
    </button>
  )
}
