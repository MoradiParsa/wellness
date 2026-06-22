import { LayoutGrid, Dumbbell, UtensilsCrossed, Scale, Menu } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface TabItem {
  key: string
  label: string
  to: string
  icon: LucideIcon
}

export const TABS: TabItem[] = [
  { key: 'dashboard', label: 'Home', to: '/', icon: LayoutGrid },
  { key: 'workout', label: 'Workout', to: '/workout', icon: Dumbbell },
  { key: 'nutrition', label: 'Nutrition', to: '/nutrition', icon: UtensilsCrossed },
  { key: 'weight', label: 'Weight', to: '/weight', icon: Scale },
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
  '/settings',
])

export function activeTabKey(pathname: string): string {
  if (pathname === '/') return 'dashboard'
  if (pathname.startsWith('/workout')) return 'workout'
  if (pathname.startsWith('/nutrition')) return 'nutrition'
  if (pathname.startsWith('/weight')) return 'weight'
  return 'more' // /more, /tasks, /analytics, /settings
}

export function showBottomNav(pathname: string): boolean {
  return NAV_VISIBLE_PATHS.has(pathname)
}
