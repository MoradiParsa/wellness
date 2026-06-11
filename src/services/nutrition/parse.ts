import type { ParsedLine } from './types'

const UNIT_MAP: Record<string, string> = {
  g: 'g', gram: 'g', grams: 'g', gm: 'g',
  kg: 'kg', kilogram: 'kg', kilograms: 'kg',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  ml: 'ml', milliliter: 'ml', milliliters: 'ml',
  l: 'l', liter: 'l', liters: 'l',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  cup: 'cup', cups: 'cup',
  slice: 'slice', slices: 'slice',
  piece: 'piece', pieces: 'piece',
  scoop: 'scoop', scoops: 'scoop',
  can: 'can', cans: 'can',
  bar: 'bar', bars: 'bar',
  handful: 'handful', handfuls: 'handful',
  clove: 'clove', cloves: 'clove',
}

const WORD_NUM: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, half: 0.5, couple: 2, dozen: 12,
}

function parseQuantity(token: string): number | null {
  if (/^\d+\/\d+$/.test(token)) {
    const [a, b] = token.split('/').map(Number)
    return b ? a / b : null
  }
  if (/^\d+(\.\d+)?$/.test(token)) return Number(token)
  if (token in WORD_NUM) return WORD_NUM[token]
  return null
}

function parseChunk(chunk: string): ParsedLine | null {
  const raw = chunk.trim()
  let s = raw.toLowerCase().replace(/[.!?]+$/, '').trim()
  if (!s || /^(and|with|of|a|an|the|some)$/.test(s)) return null

  let quantity = 1
  let hadQuantity = false
  let unit: string | null = null

  // Leading number, optionally glued to a unit ("100g", "250 g", "1 tbsp", "2 eggs").
  const m = s.match(/^(\d+\/\d+|\d+(?:\.\d+)?)\s*([a-zA-Z]+)?/)
  if (m && parseQuantity(m[1]) != null) {
    quantity = parseQuantity(m[1]) as number
    hadQuantity = true
    let consumed = m[0].length
    const word = (m[2] ?? '').toLowerCase()
    if (word && word in UNIT_MAP) unit = UNIT_MAP[word]
    else if (word) consumed -= word.length // the letters belong to the food name
    s = s.slice(consumed).trim()
  } else {
    // leading word-number ("two", "one", "a")
    const first = s.split(/\s+/)[0]
    const q = parseQuantity(first)
    if (q != null) {
      quantity = q
      hadQuantity = true
      s = s.slice(first.length).trim()
    }
  }

  // optional separate unit word ("two tablespoons olive oil")
  if (!unit) {
    const next = s.split(/\s+/)[0]
    if (next && next in UNIT_MAP) {
      unit = UNIT_MAP[next]
      s = s.slice(next.length).trim()
    }
  }

  s = s.replace(/^of\s+/, '').trim()
  if (!s) return null

  // No explicit unit: an explicit count ("2 eggs") implies pieces;
  // a bare food ("chicken") implies one ~100 g serving.
  if (!unit) unit = hadQuantity ? 'piece' : 'serving'

  return { raw, quantity, unit, name: s }
}

/** Split a free-text food description into structured {quantity, unit, name} lines. */
export function parseFoodText(text: string): ParsedLine[] {
  return text
    .split(/,|\band\b|\bwith\b|\bplus\b|\+|&|;|\n/i)
    .map(parseChunk)
    .filter((l): l is ParsedLine => l != null)
}
