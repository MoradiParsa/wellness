import type { FoodHit, FoodMacros } from './types'

// Both providers below are FREE and do not bill the user.

async function fetchJSON(url: string, ms = 7000): Promise<any | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), ms)
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : 0)

// ---------------------------------------------------------------------------
// USDA FoodData Central (free API key; DEMO_KEY works at low volume)
// ---------------------------------------------------------------------------

export async function searchUSDA(query: string, apiKey?: string): Promise<FoodHit | null> {
  const key = apiKey?.trim() || 'DEMO_KEY'
  const url =
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(key)}` +
    `&query=${encodeURIComponent(query)}&pageSize=1&dataType=${encodeURIComponent('Foundation,SR Legacy,Survey (FNDDS)')}`
  const data = await fetchJSON(url)
  const food = data?.foods?.[0]
  if (!food?.foodNutrients) return null

  const pick = (numbers: string[]) => {
    const n = food.foodNutrients.find((x: any) => numbers.includes(String(x.nutrientNumber)))
    return num(n?.value)
  }
  const per100g: FoodMacros = {
    calories: pick(['208', '957', '1008']),
    protein: pick(['203', '1003']),
    carbs: pick(['205', '1005']),
    fat: pick(['204', '1004']),
    fiber: pick(['291', '1079']),
  }
  if (per100g.calories === 0 && per100g.protein === 0) return null
  return { name: food.description ?? query, source: 'usda', per100g }
}

// ---------------------------------------------------------------------------
// OpenFoodFacts (free, no key) — branded foods & barcodes
// ---------------------------------------------------------------------------

function offMacros(nutriments: any): FoodMacros {
  return {
    calories: num(nutriments?.['energy-kcal_100g']) || Math.round(num(nutriments?.['energy_100g']) / 4.184),
    protein: num(nutriments?.proteins_100g),
    carbs: num(nutriments?.carbohydrates_100g),
    fat: num(nutriments?.fat_100g),
    fiber: num(nutriments?.fiber_100g),
  }
}

/** Grams in one serving, parsed from OFF's serving_quantity / serving_size. */
function offServingGrams(p: any): number | undefined {
  const q = num(p?.serving_quantity)
  if (q > 0) return q
  const m = String(p?.serving_size ?? '').match(/([\d.]+)\s*g/i)
  return m ? Number(m[1]) : undefined
}

function offToHit(p: any): FoodHit | null {
  if (!p?.nutriments) return null
  const per100g = offMacros(p.nutriments)
  if (per100g.calories === 0 && per100g.protein === 0) return null
  const servingGrams = offServingGrams(p)
  return {
    name: p.product_name || 'Product',
    brand: typeof p.brands === 'string' ? p.brands.split(',')[0].trim() : undefined,
    source: 'openfoodfacts',
    per100g,
    servingGrams,
    barcode: p.code,
    // map count/serving units to one serving so "2 slices" scales correctly
    unitGrams: servingGrams ? { slice: servingGrams, serving: servingGrams, piece: servingGrams } : undefined,
  }
}

/** Top branded candidates for a query (free, no key). Best match first. */
export async function searchOpenFoodFacts(query: string, pageSize = 6): Promise<FoodHit[]> {
  const url =
    `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(query)}` +
    `&fields=product_name,brands,nutriments,serving_size,serving_quantity,code&page_size=${pageSize}&sort_by=popularity_key`
  const data = await fetchJSON(url)
  const products: any[] = Array.isArray(data?.products) ? data.products : []
  return products.map(offToHit).filter((h): h is FoodHit => h != null)
}

export async function lookupBarcode(code: string): Promise<FoodHit | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,nutriments,serving_size,serving_quantity,code`
  const data = await fetchJSON(url)
  if (data?.status !== 1 || !data?.product?.nutriments) return null
  const hit = offToHit({ ...data.product, code })
  if (hit && !hit.name) hit.name = `Item ${code}`
  return hit
}
