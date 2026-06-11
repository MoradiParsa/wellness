import type { Settings, UnitWeight, UnitLength } from '@/types'

const LB_PER_KG = 2.20462262
const IN_PER_CM = 0.39370079
const OZ_PER_ML = 0.03381402 // US fluid ounce

export const kgToLb = (kg: number) => kg * LB_PER_KG
export const lbToKg = (lb: number) => lb / LB_PER_KG
export const cmToIn = (cm: number) => cm * IN_PER_CM
export const inToCm = (i: number) => i / IN_PER_CM
export const mlToOz = (ml: number) => ml * OZ_PER_ML
export const ozToMl = (oz: number) => oz / OZ_PER_ML

export const weightUnit = (s: Settings) => s.units.weight
export const lengthUnit = (s: Settings) => s.units.length
export const waterUnit = (s: Settings): 'oz' | 'ml' =>
  s.units.weight === 'lb' ? 'oz' : 'ml'

export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step
}

function trimNum(v: number, decimals: number): string {
  if (!Number.isFinite(v)) return '0'
  return String(Number(v.toFixed(decimals)))
}

// ---- Weight (canonical kg) ----

export function toDisplayWeight(kg: number, unit: UnitWeight): number {
  return unit === 'lb' ? kgToLb(kg) : kg
}

export function fromDisplayWeight(value: number, unit: UnitWeight): number {
  return unit === 'lb' ? lbToKg(value) : value
}

export function displayWeightNum(kg: number, s: Settings, decimals = 1): number {
  return Number(toDisplayWeight(kg, s.units.weight).toFixed(decimals))
}

export function formatWeight(kg: number, s: Settings, decimals = 1): string {
  return `${trimNum(toDisplayWeight(kg, s.units.weight), decimals)} ${s.units.weight}`
}

/** Smallest sensible weight step in the active unit (for steppers / rounding). */
export function liftStep(s: Settings): number {
  return s.units.weight === 'lb' ? 5 : 2.5
}

// ---- Length (canonical cm) ----

export function toDisplayLength(cm: number, unit: UnitLength): number {
  return unit === 'in' ? cmToIn(cm) : cm
}

export function fromDisplayLength(value: number, unit: UnitLength): number {
  return unit === 'in' ? inToCm(value) : value
}

export function formatLength(cm: number, s: Settings, decimals = 1): string {
  return `${trimNum(toDisplayLength(cm, s.units.length), decimals)} ${s.units.length}`
}

// ---- Water (canonical ml) ----

export function toDisplayWater(ml: number, s: Settings): number {
  return s.units.weight === 'lb' ? mlToOz(ml) : ml
}

export function fromDisplayWater(value: number, s: Settings): number {
  return s.units.weight === 'lb' ? ozToMl(value) : value
}

export function formatWater(ml: number, s: Settings): string {
  return `${Math.round(toDisplayWater(ml, s))} ${waterUnit(s)}`
}

/** A single glass/cup quick-add amount in ml (~8 oz / 250 ml). */
export const WATER_GLASS_ML = 250

// ---- Energy & macros ----

export const formatKcal = (kcal: number) => `${Math.round(kcal)}`
export const formatGrams = (g: number) => `${Math.round(g)} g`

export function formatSignedWeight(kgDelta: number, s: Settings, decimals = 1): string {
  const v = toDisplayWeight(kgDelta, s.units.weight)
  const sign = v > 0 ? '+' : ''
  return `${sign}${trimNum(v, decimals)} ${s.units.weight}`
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

export function pct(value: number, total: number): number {
  if (total <= 0) return 0
  return clamp((value / total) * 100, 0, 100)
}
