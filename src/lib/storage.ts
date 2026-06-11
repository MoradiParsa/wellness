// Swappable persistence layer. Today it is LocalStorage; to move to Supabase /
// Firebase later, implement this same interface and swap `storage` below.

export interface StorageAdapter {
  get<T>(key: string): T | null
  set<T>(key: string, value: T): void
  remove(key: string): void
  keys(): string[]
}

const PREFIX = 'progressos.'

class LocalStorageAdapter implements StorageAdapter {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      return raw == null ? null : (JSON.parse(raw) as T)
    } catch {
      return null
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch (err) {
      // Most likely a QuotaExceededError (large base64 photos).
      console.error('Progress OS: failed to persist', key, err)
    }
  }

  remove(key: string): void {
    localStorage.removeItem(PREFIX + key)
  }

  keys(): string[] {
    const out: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX)) out.push(k.slice(PREFIX.length))
    }
    return out
  }
}

export const storage: StorageAdapter = new LocalStorageAdapter()
