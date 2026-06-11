import { useCollection } from '@/data/store'
import { programsStore, settingsStore } from '@/data/collections'
import { useSettings } from './useSettings'
import { uid } from '@/lib/id'
import { nowISO } from '@/lib/date'
import type { Program } from '@/types'

export function usePrograms() {
  const programs = useCollection(programsStore)
  const { settings } = useSettings()
  const activeProgram = programs.find((p) => p.id === settings.activeProgramId) ?? null

  return {
    programs,
    activeProgram,
    getById: (id: string) => programsStore.getById(id),
    create: (program: Omit<Program, 'id' | 'createdAt'>, makeActive = true) => {
      const p: Program = { ...program, id: uid(), createdAt: nowISO() }
      programsStore.add(p)
      if (makeActive) settingsStore.set({ activeProgramId: p.id })
      return p
    },
    save: (program: Program) => programsStore.upsert(program),
    remove: (id: string) => {
      programsStore.remove(id)
      if (settingsStore.get().activeProgramId === id) {
        const next = programsStore.getAll()[0]?.id ?? null
        settingsStore.set({ activeProgramId: next })
      }
    },
    setActive: (id: string) => settingsStore.set({ activeProgramId: id }),
  }
}

export const getProgram = (id: string | null | undefined) =>
  id ? programsStore.getById(id) : undefined
