import type { FoodHit } from './types'

// Default gram weights for common count/volume units (per 1 unit).
export const DEFAULT_UNIT_GRAMS: Record<string, number> = {
  piece: 100,
  slice: 28,
  tbsp: 15,
  tsp: 5,
  cup: 240,
  scoop: 31,
  handful: 30,
  can: 150,
  bar: 60,
  link: 40,
  clove: 3,
  oz: 28.35,
  serving: 100,
}

// [names, [calories, protein, carbs, fat, fiber] per 100 g, per-food unit grams]
type Row = [string[], [number, number, number, number, number], Record<string, number>?]

const ROWS: Row[] = [
  [['chicken breast', 'chicken'], [165, 31, 0, 3.6, 0], { piece: 120, breast: 120 }],
  [['chicken thigh'], [209, 26, 0, 10.9, 0], { piece: 90 }],
  [['ground turkey', 'turkey'], [176, 27, 0, 8, 0]],
  [['ground beef', 'beef', 'hamburger'], [217, 26, 0, 11, 0]],
  [['steak', 'sirloin'], [206, 29, 0, 9, 0]],
  [['salmon'], [208, 20, 0, 13, 0], { fillet: 150 }],
  [['tuna'], [116, 26, 0, 1, 0], { can: 120 }],
  [['tilapia'], [129, 26, 0, 3, 0]],
  [['shrimp'], [99, 24, 0.2, 0.3, 0]],
  [['cod'], [105, 23, 0, 1, 0]],
  [['egg', 'eggs', 'whole egg'], [155, 13, 1.1, 11, 0], { egg: 50, piece: 50 }],
  [['egg white', 'egg whites'], [52, 11, 0.7, 0.2, 0], { egg: 33, piece: 33 }],
  [['bacon'], [541, 37, 1.4, 42, 0], { slice: 8, piece: 8 }],
  [['sausage'], [301, 18, 2, 25, 0], { link: 40, piece: 40 }],
  [['white rice', 'rice', 'jasmine rice'], [130, 2.7, 28, 0.3, 0.4], { cup: 158 }],
  [['brown rice'], [123, 2.7, 26, 1, 1.6], { cup: 195 }],
  [['oats', 'oatmeal', 'rolled oats'], [389, 17, 66, 7, 11], { cup: 81 }],
  [['potato', 'white potato'], [87, 2, 20, 0.1, 1.8], { piece: 170 }],
  [['sweet potato'], [86, 1.6, 20, 0.1, 3], { piece: 130 }],
  [['pasta', 'spaghetti', 'noodles'], [157, 5.8, 31, 0.9, 1.8], { cup: 140 }],
  [['bread', 'toast'], [265, 9, 49, 3.2, 2.7], { slice: 28, piece: 28 }],
  [['tortilla', 'wrap'], [304, 8, 49, 8, 3], { piece: 45 }],
  [['bagel'], [250, 10, 49, 1.5, 2], { piece: 98 }],
  [['quinoa'], [120, 4.4, 21, 1.9, 2.8], { cup: 185 }],
  [['black beans', 'beans'], [132, 8.9, 24, 0.5, 8.7], { cup: 172 }],
  [['lentils'], [116, 9, 20, 0.4, 8], { cup: 198 }],
  [['chickpeas', 'garbanzo'], [164, 8.9, 27, 2.6, 7.6], { cup: 164 }],
  [['olive oil', 'oil'], [884, 0, 0, 100, 0], { tbsp: 13.5, tsp: 4.5 }],
  [['butter'], [717, 0.9, 0.1, 81, 0], { tbsp: 14, tsp: 5, pat: 5 }],
  [['peanut butter'], [588, 25, 20, 50, 6], { tbsp: 16 }],
  [['almond butter'], [614, 21, 19, 56, 10], { tbsp: 16 }],
  [['almonds'], [579, 21, 22, 50, 12], { handful: 30, oz: 28 }],
  [['walnuts'], [654, 15, 14, 65, 7], { handful: 30 }],
  [['peanuts'], [567, 26, 16, 49, 9], { handful: 30 }],
  [['milk', '2% milk', 'whole milk'], [50, 3.4, 4.8, 2, 0], { cup: 244 }],
  [['skim milk'], [34, 3.4, 5, 0.1, 0], { cup: 245 }],
  [['almond milk'], [15, 0.6, 0.6, 1.1, 0.3], { cup: 240 }],
  [['greek yogurt'], [59, 10, 3.6, 0.4, 0], { cup: 245, container: 170 }],
  [['yogurt'], [61, 3.5, 4.7, 3.3, 0], { cup: 245 }],
  [['cottage cheese'], [98, 11, 3.4, 4.3, 0], { cup: 226 }],
  [['cheddar cheese', 'cheese'], [403, 25, 1.3, 33, 0], { slice: 23, oz: 28 }],
  [['mozzarella'], [280, 28, 3.1, 17, 0], { oz: 28 }],
  [['whey protein', 'protein powder', 'whey'], [400, 80, 8, 6, 2], { scoop: 31 }],
  [['casein protein', 'casein'], [360, 75, 9, 2, 1], { scoop: 33 }],
  [['banana'], [89, 1.1, 23, 0.3, 2.6], { piece: 118 }],
  [['apple'], [52, 0.3, 14, 0.2, 2.4], { piece: 182 }],
  [['orange'], [47, 0.9, 12, 0.1, 2.4], { piece: 131 }],
  [['strawberries', 'strawberry'], [32, 0.7, 7.7, 0.3, 2], { cup: 144 }],
  [['blueberries', 'blueberry'], [57, 0.7, 14, 0.3, 2.4], { cup: 148 }],
  [['grapes'], [69, 0.7, 18, 0.2, 0.9], { cup: 151 }],
  [['broccoli'], [34, 2.8, 7, 0.4, 2.6], { cup: 91 }],
  [['spinach'], [23, 2.9, 3.6, 0.4, 2.2], { cup: 30 }],
  [['avocado'], [160, 2, 9, 15, 7], { piece: 150 }],
  [['tomato'], [18, 0.9, 3.9, 0.2, 1.2], { piece: 123 }],
  [['carrot', 'carrots'], [41, 0.9, 10, 0.2, 2.8], { piece: 61 }],
  [['salad', 'mixed greens', 'lettuce'], [20, 1.5, 3.5, 0.3, 1.8], { cup: 30 }],
  [['honey'], [304, 0.3, 82, 0, 0.2], { tbsp: 21 }],
  [['sugar'], [387, 0, 100, 0, 0], { tsp: 4, tbsp: 12 }],
  [['ketchup'], [101, 1, 27, 0.1, 0.3], { tbsp: 17 }],
  [['mayonnaise', 'mayo'], [680, 1, 0.6, 75, 0], { tbsp: 14 }],
  [['sour cream'], [198, 2.4, 4.6, 19, 0], { tbsp: 12 }],
  [['dark chocolate', 'chocolate'], [546, 4.9, 61, 31, 7], { piece: 10 }],
  [['protein bar'], [350, 30, 40, 12, 5], { bar: 60, piece: 60 }],
  [['pizza'], [266, 11, 33, 10, 2.3], { slice: 107 }],
  [['french fries', 'fries'], [312, 3.4, 41, 15, 3.8]],
  [['coffee', 'black coffee'], [1, 0.1, 0, 0, 0], { cup: 240 }],
]

export const LOCAL_FOODS: FoodHit[] = ROWS.map(([names, m, u]) => ({
  name: names[0],
  source: 'local',
  per100g: { calories: m[0], protein: m[1], carbs: m[2], fat: m[3], fiber: m[4] },
  unitGrams: { ...DEFAULT_UNIT_GRAMS, ...(u ?? {}) },
  // store aliases on a hidden field via closure below
}))

// keep alias lists alongside foods for matching
const ALIASES: string[][] = ROWS.map(([names]) => names)

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

/** Best local match for a free-text food name, or null. */
export function findLocalFood(name: string): FoodHit | null {
  const q = norm(name)
  if (!q) return null
  const qNoS = q.replace(/s\b/g, '')
  let best: FoodHit | null = null
  let bestScore = 0
  LOCAL_FOODS.forEach((food, i) => {
    for (const alias of ALIASES[i]) {
      const a = norm(alias)
      let score = 0
      if (q === a || qNoS === a) score = a.length + 100
      else if (q.includes(a) || qNoS.includes(a)) score = a.length
      if (score > bestScore) {
        bestScore = score
        best = food
      }
    }
  })
  return best
}
