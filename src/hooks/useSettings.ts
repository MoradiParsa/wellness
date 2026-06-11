import { useSingleton } from '@/data/store'
import { settingsStore } from '@/data/collections'
import type { Settings } from '@/types'

export function useSettings() {
  const settings = useSingleton(settingsStore)
  return {
    settings,
    update: (patch: Partial<Settings>) => settingsStore.set(patch),
  }
}

export const getSettings = () => settingsStore.get()
