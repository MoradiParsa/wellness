import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { useTasks } from '@/hooks/useTasks'
import { TASK_CATEGORIES, TASK_PRIORITIES, RECURRENCES } from '@/lib/constants'
import { todayKey } from '@/lib/date'
import type { Task, TaskCategory, TaskPriority, Recurrence } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task
}

export function TaskSheet({ open, onOpenChange, task }: Props) {
  const { add, save } = useTasks()

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [category, setCategory] = useState<TaskCategory>('fitness')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState<string>('')
  const [recurrence, setRecurrence] = useState<Recurrence>('none')

  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
    setNotes(task?.notes ?? '')
    setCategory(task?.category ?? 'fitness')
    setPriority(task?.priority ?? 'medium')
    setDueDate(task?.dueDate ?? todayKey())
    setRecurrence(task?.recurrence ?? 'none')
  }, [open, task])

  const submit = () => {
    if (!title.trim()) return
    const data = {
      title: title.trim(),
      notes: notes.trim() || undefined,
      category,
      priority,
      dueDate: dueDate || undefined,
      recurrence,
    }
    if (task) save({ ...task, ...data })
    else add(data)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-h-[92dvh]">
        <SheetHeader>
          <SheetTitle>{task ? 'Edit task' : 'New task'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" autoFocus />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <SegmentedControl
              layoutId="task-category"
              size="sm"
              value={category}
              onChange={setCategory}
              options={TASK_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <SegmentedControl
              layoutId="task-priority"
              value={priority}
              onChange={setPriority}
              options={TASK_PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Repeat</Label>
              <Select value={recurrence} onValueChange={(v) => setRecurrence(v as Recurrence)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional details…" />
          </div>

          <Button size="lg" className="w-full" onClick={submit} disabled={!title.trim()}>
            {task ? 'Save changes' : 'Add task'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
