import { LayoutGrid, Dumbbell, UtensilsCrossed, Scale, Menu, ListChecks, BarChart3, LineChart, Camera } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface TabItem {
  key: string
  label: string
  to: string
  icon: LucideIcon
}

/** All available tabs (including those that can be hidden). */
export const ALL_TABS: TabItem[] = [
  { key: 'dashboard', label: 'Home', to: '/', icon: LayoutGrid },
  { key: 'workout', label: 'Workout', to: '/workout', icon: Dumbbell },
  { key: 'nutrition', label: 'Nutrition', to: '/nutrition', icon: UtensilsCrossed },
  { key: 'weight', label: 'Weight', to: '/weight', icon: Scale },
  { key: 'tasks', label: 'Tasks', to: '/tasks', icon: ListChecks },
  { key: 'analytics', label: 'Analytics', to: '/analytics', icon: BarChart3 },
  { key: 'progress', label: 'Progress', to: '/progress', icon: LineChart },
  { key: 'photos', label: 'Photos', to: '/photos', icon: Camera },
  { key: 'more', label: 'More', to: '/more', icon: Menu },
]

/** Routes that display the bottom tab bar. */
export const NAV_VISIBLE_PATHS = new Set([
  '/',
  '/workout',
  '/nutrition',
  '/weight',
  '/more',
  '/tasks',
  '/analytics',
  '/progress',
  '/health',
  '/photos',
  '/settings',
])

/**
 * Get the filtered tabs based on the visible keys setting.
 * Always includes 'dashboard'; includes 'more' if there are hidden tabs.
 */
export function getVisibleTabs(visibleKeys: string[]): TabItem[] {
  const normalized = new Set(visibleKeys)
  // Dashboard always visible
  if (!normalized.has('dashboard')) normalized.add('dashboard')
  // More always visible if there are hidden tabs
  const allKeys = new Set(ALL_TABS.map((t) => t.key))
  if (normalized.size < allKeys.size) normalized.add('more')
  return ALL_TABS.filter((t) => normalized.has(t.key))
}

export function activeTabKey(pathname: string): string {
  if (pathname === '/') return 'dashboard'
  if (pathname.startsWith('/workout')) return 'workout'
  if (pathname.startsWith('/nutrition')) return 'nutrition'
  if (pathname.startsWith('/weight')) return 'weight'
  if (pathname.startsWith('/tasks')) return 'tasks'
  if (pathname.startsWith('/analytics')) return 'analytics'
  if (pathname.startsWith('/progress')) return 'progress'
  if (pathname.startsWith('/photos')) return 'photos'
  return 'more' // /more, /settings, /health
}

export function showBottomNav(pathname: string): boolean {
  return NAV_VISIBLE_PATHS.has(pathname)
}
