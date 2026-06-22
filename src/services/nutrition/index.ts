import type { Settings, MealItem } from '@/types'
import type { FoodHit, FoodMacros, ParsedLine } from './types'
import { findLocalFood, DEFAULT_UNIT_GRAMS } from './foods'
import { parseFoodText } from './parse'
import { searchUSDA, searchOpenFoodFacts, lookupBarcode } from './providers'
import { mealsStore } from '@/data/collections'

export * from './ai'
export { parseFoodText } from './parse'
export type { ParsedLine } from './types'

const MASS_GRAMS: Record<string, number> = { g: 1, kg: 1000, oz: 28.35, lb: 453.6, ml: 1, l: 1000 }

function gramsForLine(line: ParsedLine, food?: FoodHit): number {
  if (line.unit in MASS_GRAMS) return line.quantity * MASS_GRAMS[line.unit]
  const map = { ...DEFAULT_UNIT_GRAMS, ...(food?.unitGrams ?? {}) }
  const per = map[line.unit] ?? map.serving ?? 100
  return line.quantity * per
}

function scale(per100g: FoodMacros, grams: number): FoodMacros {
  const k = grams / 100
  return {
    calories: Math.round(per100g.calories * k),
    protein: Math.round(per100g.protein * k),
    carbs: Math.round(per100g.carbs * k),
    fat: Math.round(per100g.fat * k),
    fiber: Math.round(per100g.fiber * k),
  }
}

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase())

function itemFromHit(line: ParsedLine, hit: FoodHit): MealItem {
  const grams = gramsForLine(line, hit)
  const m = scale(hit.per100g, grams)
  return {
    name: titleCase(hit.name),
    quantity: line.quantity,
    unit: line.unit,
    grams: Math.round(grams),
    calories: m.calories,
    protein: m.protein,
    carbs: m.carbs,
    fat: m.fat,
    fiber: m.fiber,
    source: hit.source,
    confidence: hit.source === 'local' ? 0.95 : 0.85,
  }
}

function blankItem(line: ParsedLine): MealItem {
  return {
    name: titleCase(line.name),
    quantity: line.quantity,
    unit: line.unit,
    grams: line.unit in MASS_GRAMS ? Math.round(gramsForLine(line)) : undefined,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    source: 'manual',
  }
}

/** A previously-logged food, normalized to per-100 g so it can be re-scaled. */
function findCachedFood(name: string): FoodHit | undefined {
  const want = name.trim().toLowerCase()
  const meals = [...mealsStore.getAll()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  for (const m of meals) {
    for (const it of m.items ?? []) {
      if (it.name.trim().toLowerCase() === want && it.grams && it.grams > 0) {
        const k = 100 / it.grams
        return {
          name: it.name,
          source: it.source,
          per100g: {
            calories: it.calories * k,
            protein: it.protein * k,
            carbs: it.carbs * k,
            fat: it.fat * k,
            fiber: (it.fiber ?? 0) * k,
          },
          unitGrams:
            it.unit && it.quantity > 0 ? { [it.unit]: it.grams / it.quantity } : undefined,
        }
      }
    }
  }
  return undefined
}

/** Resolve one line, free-first: local → cached → USDA → OpenFoodFacts → manual. */
export async function resolveLine(line: ParsedLine, settings: Settings): Promise<MealItem> {
  const local = findLocalFood(line.name)
  if (local) return itemFromHit(line, local)

  const cached = findCachedFood(line.name)
  if (cached) return itemFromHit(line, cached)

  const usda = await searchUSDA(line.name, settings.ai.usdaKey)
  if (usda) return itemFromHit(line, usda)

  const off = await searchOpenFoodFacts(line.name)
  if (off) return itemFromHit(line, off)

  return blankItem(line)
}

/** Parse free text/voice into editable, macro-resolved meal items. */
export async function parseAndResolve(text: string, settings: Settings): Promise<MealItem[]> {
  const lines = parseFoodText(text)
  return Promise.all(lines.map((l) => resolveLine(l, settings)))
}

/** Look up a scanned/typed barcode via OpenFoodFacts (free). */
export async function resolveBarcode(code: string): Promise<MealItem | null> {
  const hit = await lookupBarcode(code)
  if (!hit) return null
  const grams = 100
  const m = scale(hit.per100g, grams)
  return {
    name: titleCase([hit.brand, hit.name].filter(Boolean).join(' ').trim()),
    quantity: grams,
    unit: 'g',
    grams,
    calories: m.calories,
    protein: m.protein,
    carbs: m.carbs,
    fat: m.fat,
    fiber: m.fiber,
    source: 'openfoodfacts',
    confidence: 0.85,
  }
}

export function sumItems(items: MealItem[]): FoodMacros {
  return items.reduce<FoodMacros>(
    (a, i) => ({
      calories: a.calories + i.calories,
      protein: a.protein + i.protein,
      carbs: a.carbs + i.carbs,
      fat: a.fat + i.fat,
      fiber: a.fiber + (i.fiber ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  )
}
