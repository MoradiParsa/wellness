// ============================================================================
// Nutrition Facts label OCR — free, client-side (Tesseract.js, lazy-loaded).
// This is for a photo of a NUTRITION LABEL, not a plate of food.
// ============================================================================

export interface LabelFacts {
  servingSize?: string
  servingGrams?: number
  servingsPerContainer?: number
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  sugar?: number
  sodium?: number // mg
}

/** Run OCR on a label image data URL. Downloads the OCR engine on first use. */
export async function ocrText(dataUrl: string): Promise<string> {
  const Tesseract = await import('tesseract.js')
  const { data } = await Tesseract.recognize(dataUrl, 'eng')
  return data?.text ?? ''
}

/** Best-effort extraction of Nutrition Facts numbers from OCR text. */
export function parseNutritionFacts(text: string): LabelFacts {
  const t = text.toLowerCase().replace(/ /g, ' ')
  const grab = (re: RegExp): number | undefined => {
    const m = t.match(re)
    return m ? parseFloat(m[1]) : undefined
  }

  const facts: LabelFacts = {
    calories: grab(/calories\s*[:\-]?\s*(\d+(?:\.\d+)?)/),
    fat: grab(/total\s*fat\s*([\d.]+)\s*g/),
    carbs: grab(/total\s*carb\w*\.?\s*([\d.]+)\s*g/),
    protein: grab(/protein\s*([\d.]+)\s*g/),
    fiber: grab(/(?:dietary\s*)?fib\w*\s*([\d.]+)\s*g/),
    sugar: grab(/sugars?\s*([\d.]+)\s*g/),
    sodium: grab(/sodium\s*([\d.]+)\s*mg/),
    servingsPerContainer: grab(/servings?\s*per\s*container\s*(?:about\s*)?([\d.]+)/),
  }

  const sizeLine = t.match(/serving\s*size\s*[:\-]?\s*([^\n]+)/)
  if (sizeLine) {
    facts.servingSize = sizeLine[1].trim().replace(/\s+/g, ' ').slice(0, 40)
    const g = sizeLine[1].match(/\(?\s*([\d.]+)\s*g\)?/)
    if (g) facts.servingGrams = parseFloat(g[1])
  }
  return facts
}

/** OCR a label image and parse it into editable facts. */
export async function scanNutritionLabel(dataUrl: string): Promise<LabelFacts> {
  return parseNutritionFacts(await ocrText(dataUrl))
}
