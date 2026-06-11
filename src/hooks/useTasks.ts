import { addDays, addMonths, addWeeks, getDay } from 'date-fns'
import { useCollection } from '@/data/store'
import { tasksStore } from '@/data/collections'
import { uid } from '@/lib/id'
import { nowISO, dateKey, parseKey } from '@/lib/date'
import type { Task, Recurrence } from '@/types'

export type TaskFilter = 'today' | 'upcoming' | 'overdue' | 'completed'

function nextDueKey(key: string, recurrence: Recurrence): string | null {
  const d = parseKey(key)
  switch (recurrence) {
    case 'daily':
      return dateKey(addDays(d, 1))
    case 'weekly':
      return dateKey(addWeeks(d, 1))
    case 'monthly':
      return dateKey(addMonths(d, 1))
    case 'weekdays': {
      let next = addDays(d, 1)
      while (getDay(next) === 0 || getDay(next) === 6) next = addDays(next, 1)
      return dateKey(next)
    }
    default:
      return null
  }
}

const priorityRank: Record<Task['priority'], number> = { high: 0, medium: 1, low: 2 }

export function useTasks() {
  const tasks = useCollection(tasksStore)

  const sorted = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    const da = a.dueDate ?? '9999-12-31'
    const db = b.dueDate ?? '9999-12-31'
    if (da !== db) return da.localeCompare(db)
    return priorityRank[a.priority] - priorityRank[b.priority]
  })

  const toggleComplete = (id: string) => {
    const task = tasksStore.getById(id)
    if (!task) return
    const completing = !task.completed
    tasksStore.update(id, {
      completed: completing,
      completedAt: completing ? nowISO() : undefined,
    })
    // Spawn the next occurrence for recurring tasks on completion.
    if (completing && task.recurrence !== 'none' && task.dueDate) {
      const next = nextDueKey(task.dueDate, task.recurrence)
      if (next) {
        const clone: Task = {
          ...task,
          id: uid(),
          dueDate: next,
          completed: false,
          completedAt: undefined,
          createdAt: nowISO(),
        }
        tasksStore.add(clone)
      }
    }
  }

  return {
    tasks: sorted,
    add: (data: Omit<Task, 'id' | 'createdAt' | 'completed' | 'completedAt'>) => {
      const task: Task = { ...data, id: uid(), completed: false, createdAt: nowISO() }
      tasksStore.add(task)
      return task
    },
    save: (task: Task) => tasksStore.upsert(task),
    remove: (id: string) => tasksStore.remove(id),
    getById: (id: string) => tasksStore.getById(id),
    toggleComplete,
  }
}

export function filterTasks(tasks: Task[], filter: TaskFilter): Task[] {
  const today = dateKey()
  switch (filter) {
    case 'today':
      return tasks.filter((t) => !t.completed && (!t.dueDate || t.dueDate === today))
    case 'upcoming':
      return tasks.filter((t) => !t.completed && t.dueDate != null && t.dueDate > today)
    case 'overdue':
      return tasks.filter((t) => !t.completed && t.dueDate != null && t.dueDate < today)
    case 'completed':
      return tasks.filter((t) => t.completed)
  }
}
