import type { FoodSource, MealItem } from '@/types'

export interface FoodMacros {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

/** A nutrition database entry, normalized to macros per 100 g. */
export interface FoodHit {
  name: string
  brand?: string
  source: FoodSource
  per100g: FoodMacros
  /** Gram weights for count/volume units specific to this food (e.g. egg: 50). */
  unitGrams?: Record<string, number>
  /** grams in one labeled serving (e.g. one slice) when known */
  servingGrams?: number
  barcode?: string
}

export interface ParsedLine {
  raw: string
  quantity: number
  unit: string
  name: string
}

export interface ResolveResult {
  items: MealItem[]
  unresolved: string[]
}

export type { MealItem }
