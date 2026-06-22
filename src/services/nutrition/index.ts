import type { Settings, MealItem, MatchQuality, VerifiedFood } from '@/types'
import type { FoodHit, FoodMacros, ParsedLine } from './types'
import { findLocalFood, DEFAULT_UNIT_GRAMS } from './foods'
import { parseFoodText } from './parse'
import { searchUSDA, searchOpenFoodFacts, lookupBarcode } from './providers'
import { mealsStore, verifiedFoodsStore } from '@/data/collections'

export * from './ai'
export { parseFoodText } from './parse'
export type { ParsedLine } from './types'
export type { FoodHit } from './types'

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

const CONFIDENCE: Record<MatchQuality, number> = { exact: 0.97, close: 0.8, generic: 0.6, estimate: 0.3 }

// Hints that a query is a branded/packaged product (→ search OpenFoodFacts first).
const BRAND_HINTS = [
  "nature's own", 'quest', 'premier protein', 'chobani', 'oikos', 'fairlife', 'clif',
  'kodiak', 'kirkland', 'cheerios', 'gatorade', 'muscle milk', 'optimum nutrition',
  'pop-tarts', 'oreo', 'doritos', 'lays', "kellogg", 'quaker', 'pringles', 'gardetto',
]

function looksBranded(name: string): boolean {
  const n = name.toLowerCase()
  if (/[a-z]'s\b/.test(n)) return true // possessive, e.g. "nature's"
  if (BRAND_HINTS.some((b) => n.includes(b))) return true
  return normalize(n).split(' ').length >= 3
}

/** exact when (nearly) all query words appear in the product's brand+name, else close. */
function qualityFor(query: string, hit: FoodHit): MatchQuality {
  const target = normalize(`${hit.brand ?? ''} ${hit.name}`)
  const toks = normalize(query).split(' ').filter((t) => t.length > 2)
  if (toks.length === 0) return 'close'
  const hits = toks.filter((t) => target.includes(t)).length
  return hits / toks.length >= 0.8 ? 'exact' : 'close'
}

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

// Capitalize the first letter of each word, but not letters after an apostrophe
// (so "nature's" stays "Nature's", not "Nature'S").
const titleCase = (s: string) => s.replace(/(^|\s)([a-z])/g, (_, sp, c) => sp + c.toUpperCase())

function itemFromHit(line: ParsedLine, hit: FoodHit, match: MatchQuality): MealItem {
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
    brand: hit.brand,
    match,
    confidence: CONFIDENCE[match],
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
    match: 'estimate',
  }
}

function verifiedToHit(v: VerifiedFood): FoodHit {
  return {
    name: v.name,
    brand: v.brand,
    source: 'verified',
    per100g: v.per100g,
    servingGrams: v.servingGrams,
    unitGrams: v.servingGrams
      ? { slice: v.servingGrams, serving: v.servingGrams, piece: v.servingGrams }
      : undefined,
  }
}

/** Priority 1: the user's own verified foods (label scans, confirmed products). */
function findVerifiedFood(name: string): FoodHit | undefined {
  const toks = normalize(name).split(' ').filter((w) => w.length > 2)
  if (toks.length === 0) return undefined
  const v = verifiedFoodsStore.getAll().find((f) => {
    const t = normalize(`${f.brand ?? ''} ${f.name}`)
    return toks.every((w) => t.includes(w))
  })
  return v ? verifiedToHit(v) : undefined
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

/**
 * Resolve one line, accuracy-first:
 *   verified foods → cached/recent → (branded? OpenFoodFacts : local/USDA) → … → manual estimate.
 * A detected brand prioritizes OpenFoodFacts before USDA.
 */
export async function resolveLine(line: ParsedLine, settings: Settings): Promise<MealItem> {
  const verified = findVerifiedFood(line.name)
  if (verified) return itemFromHit(line, verified, 'exact')

  const cached = findCachedFood(line.name)
  if (cached) return itemFromHit(line, cached, 'close')

  if (looksBranded(line.name)) {
    // Branded query: try the branded DB, then USDA — but never a loose local
    // substring match (that's what produced wrong "generic" guesses). If nothing
    // verifies, fall through to a flagged manual estimate so the user can choose.
    const off = (await searchOpenFoodFacts(line.name))[0]
    if (off) return itemFromHit(line, off, qualityFor(line.name, off))
    const usda = await searchUSDA(line.name, settings.ai.usdaKey)
    if (usda) return itemFromHit(line, usda, 'generic')
  } else {
    const local = findLocalFood(line.name)
    if (local) return itemFromHit(line, local, 'generic')
    const usda = await searchUSDA(line.name, settings.ai.usdaKey)
    if (usda) return itemFromHit(line, usda, 'generic')
    const off = (await searchOpenFoodFacts(line.name))[0]
    if (off) return itemFromHit(line, off, qualityFor(line.name, off))
  }

  return blankItem(line)
}

/** Parse free text/voice into editable, macro-resolved meal items. */
export async function parseAndResolve(text: string, settings: Settings): Promise<MealItem[]> {
  const lines = parseFoodText(text)
  return Promise.all(lines.map((l) => resolveLine(l, settings)))
}

/** Branded product candidates for a query, so the user can pick the right match. */
export async function searchProducts(query: string): Promise<MealItem[]> {
  const hits = await searchOpenFoodFacts(query, 8)
  const line: ParsedLine = { raw: query, quantity: 1, unit: 'serving', name: query }
  return hits.map((h) => itemFromHit(line, h, qualityFor(query, h)))
}

/** Look up a scanned/typed barcode via OpenFoodFacts (free). One serving when known. */
export async function resolveBarcode(code: string): Promise<MealItem | null> {
  const hit = await lookupBarcode(code)
  if (!hit) return null
  const grams = hit.servingGrams && hit.servingGrams > 0 ? hit.servingGrams : 100
  const m = scale(hit.per100g, grams)
  return {
    name: titleCase([hit.brand, hit.name].filter(Boolean).join(' ').trim()),
    quantity: hit.servingGrams ? 1 : grams,
    unit: hit.servingGrams ? 'serving' : 'g',
    grams,
    calories: m.calories,
    protein: m.protein,
    carbs: m.carbs,
    fat: m.fat,
    fiber: m.fiber,
    source: 'openfoodfacts',
    brand: hit.brand,
    match: 'exact',
    confidence: CONFIDENCE.exact,
  }
}

/** Persist a verified food so future lookups match it first. */
export function addVerifiedFood(v: Omit<VerifiedFood, 'id' | 'createdAt'>): VerifiedFood {
  const food: VerifiedFood = { ...v, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
  verifiedFoodsStore.add(food)
  return food
}

/** One serving of a verified food as an editable meal item. */
export function verifiedFoodItem(v: VerifiedFood): MealItem {
  const grams = v.servingGrams && v.servingGrams > 0 ? v.servingGrams : 100
  const line: ParsedLine = {
    raw: v.name,
    quantity: v.servingGrams ? 1 : grams,
    unit: v.servingGrams ? 'serving' : 'g',
    name: v.name,
  }
  return itemFromHit(line, verifiedToHit(v), 'exact')
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
