// ============================================================================
// Health integration service layer (FUTURE).
//
// Mirrors the storage-adapter pattern: a provider-agnostic interface plus
// no-op stubs. Real integrations (Apple HealthKit, Garmin, Google Fit) require
// a native wrapper or OAuth + a small backend, so they're stubbed here. When
// ready, implement a HealthProvider and the rest of the app can fold daily
// active calories into the TDEE estimate without further changes.
// ============================================================================

export interface HealthMetrics {
  date: string
  steps?: number
  activeCalories?: number
  caloriesBurned?: number
  restingHeartRate?: number
  sleepHours?: number
  workoutMinutes?: number
}

export interface HealthProvider {
  id: 'apple' | 'garmin' | 'google'
  name: string
  available: boolean
  isConnected(): boolean
  connect(): Promise<boolean>
  disconnect(): Promise<void>
  getDailyMetrics(dateKey: string): Promise<HealthMetrics | null>
}

function stub(id: HealthProvider['id'], name: string): HealthProvider {
  return {
    id,
    name,
    available: false,
    isConnected: () => false,
    connect: async () => false,
    disconnect: async () => {},
    getDailyMetrics: async () => null,
  }
}

export const HEALTH_PROVIDERS: HealthProvider[] = [
  stub('apple', 'Apple Health'),
  stub('garmin', 'Garmin'),
  stub('google', 'Google Fit'),
]

/**
 * Average active calories reported by connected providers for a day, to add to
 * TDEE later. Returns 0 while all providers are stubs.
 */
export async function activeCaloriesForTDEE(dateKey: string): Promise<number> {
  const connected = HEALTH_PROVIDERS.filter((p) => p.isConnected())
  if (connected.length === 0) return 0
  const metrics = await Promise.all(connected.map((p) => p.getDailyMetrics(dateKey)))
  const vals = metrics.map((m) => m?.activeCalories ?? 0).filter((v) => v > 0)
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
}
