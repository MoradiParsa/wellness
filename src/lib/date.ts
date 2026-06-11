import {
  format,
  parseISO,
  addDays,
  subDays,
  differenceInCalendarDays,
  isToday as dfIsToday,
  startOfWeek,
  startOfMonth,
} from 'date-fns'

/** Canonical date key used across the app: YYYY-MM-DD (local time). */
export function dateKey(d: Date = new Date()): string {
  return format(d, 'yyyy-MM-dd')
}

export function parseKey(key: string): Date {
  return parseISO(key)
}

export function todayKey(): string {
  return dateKey(new Date())
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function addDaysKey(key: string, n: number): string {
  return dateKey(addDays(parseKey(key), n))
}

/** Keys for the last N days, oldest first, ending today. */
export function lastNDayKeys(n: number): string[] {
  const out: string[] = []
  const today = new Date()
  for (let i = n - 1; i >= 0; i--) out.push(dateKey(subDays(today, i)))
  return out
}

export function isToday(key: string): boolean {
  return dfIsToday(parseKey(key))
}

export function isPast(key: string): boolean {
  return differenceInCalendarDays(parseKey(key), new Date()) < 0
}

export function isFuture(key: string): boolean {
  return differenceInCalendarDays(parseKey(key), new Date()) > 0
}

export function daysAgo(key: string): number {
  return differenceInCalendarDays(new Date(), parseKey(key))
}

export function daysBetweenKeys(a: string, b: string): number {
  return Math.abs(differenceInCalendarDays(parseKey(a), parseKey(b)))
}

export function weekStartKey(d: Date = new Date()): string {
  return dateKey(startOfWeek(d, { weekStartsOn: 1 }))
}

export function monthStartKey(d: Date = new Date()): string {
  return dateKey(startOfMonth(d))
}

// ---- Display formatters ----

export function formatPretty(key: string): string {
  return format(parseKey(key), 'EEE, MMM d')
}

export function formatLong(key: string): string {
  return format(parseKey(key), 'EEEE, MMMM d, yyyy')
}

export function formatMonthDay(key: string): string {
  return format(parseKey(key), 'MMM d')
}

export function formatRelativeDue(key: string): string {
  const diff = differenceInCalendarDays(parseKey(key), new Date())
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff < 7) return `In ${diff}d`
  return format(parseKey(key), 'MMM d')
}
