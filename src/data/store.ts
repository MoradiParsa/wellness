import { useSyncExternalStore } from 'react'
import { storage } from '@/lib/storage'

export interface Identifiable {
  id: string
}

export interface Collection<T extends Identifiable> {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => T[]
  getAll: () => T[]
  getById: (id: string) => T | undefined
  add: (item: T) => void
  addMany: (items: T[]) => void
  update: (id: string, patch: Partial<T>) => void
  upsert: (item: T) => void
  remove: (id: string) => void
  setAll: (items: T[]) => void
  clear: () => void
}

export function createCollection<T extends Identifiable>(key: string): Collection<T> {
  let items: T[] = storage.get<T[]>(key) ?? []
  const listeners = new Set<() => void>()

  const commit = (next: T[]) => {
    items = next
    storage.set(key, items)
    listeners.forEach((l) => l())
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot: () => items,
    getAll: () => items,
    getById: (id) => items.find((i) => i.id === id),
    add: (item) => commit([...items, item]),
    addMany: (arr) => commit([...items, ...arr]),
    update: (id, patch) =>
      commit(items.map((i) => (i.id === id ? { ...i, ...patch } : i))),
    upsert: (item) =>
      commit(
        items.some((i) => i.id === item.id)
          ? items.map((i) => (i.id === item.id ? item : i))
          : [...items, item],
      ),
    remove: (id) => commit(items.filter((i) => i.id !== id)),
    setAll: (arr) => commit(arr),
    clear: () => commit([]),
  }
}

export interface Singleton<T> {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => T
  get: () => T
  set: (patch: Partial<T>) => void
  replace: (value: T) => void
}

export function createSingleton<T extends object>(key: string, initial: T): Singleton<T> {
  let value: T = { ...initial, ...(storage.get<Partial<T>>(key) ?? {}) }
  const listeners = new Set<() => void>()

  const commit = (next: T) => {
    value = next
    storage.set(key, value)
    listeners.forEach((l) => l())
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot: () => value,
    get: () => value,
    set: (patch) => commit({ ...value, ...patch }),
    replace: (next) => commit(next),
  }
}

// React bindings -----------------------------------------------------------

export function useCollection<T extends Identifiable>(col: Collection<T>): T[] {
  return useSyncExternalStore(col.subscribe, col.getSnapshot, col.getSnapshot)
}

export function useSingleton<T extends object>(s: Singleton<T>): T {
  return useSyncExternalStore(s.subscribe, s.getSnapshot, s.getSnapshot)
}
