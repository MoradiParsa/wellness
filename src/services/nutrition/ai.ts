import type { Settings, MealItem } from '@/types'
import { settingsStore } from '@/data/collections'
import { dateKey } from '@/lib/date'

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001' // cheapest capable vision model
const OPENAI_MODEL = 'gpt-4o-mini'

const ITEM_SCHEMA =
  'Return ONLY a JSON array (no prose, no markdown). Each element: ' +
  '{"name": string, "quantity": number, "unit": string, "grams": number, ' +
  '"calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "confidence": number between 0 and 1}.'

export function buildTextPrompt(text: string): string {
  return `Estimate the nutrition of this meal. ${ITEM_SCHEMA}\n\nMeal: ${text}`
}

export function buildPhotoPrompt(): string {
  return `Identify each food in this meal photo, estimate portion sizes, and estimate nutrition. ${ITEM_SCHEMA}`
}

export interface AiAvailability {
  ok: boolean
  reason?: string
}

export function aiAvailability(settings: Settings): AiAvailability {
  const ai = settings.ai
  if (!ai.paidAiEnabled) return { ok: false, reason: 'Paid AI is off. Enable it in Settings to use automatic analysis.' }
  if (!ai.apiKey.trim()) return { ok: false, reason: 'Add your API key in Settings → AI & food data.' }
  const month = dateKey().slice(0, 7)
  const used = ai.usageMonth === month ? ai.usageCount : 0
  if (used >= ai.monthlyAiLimit) return { ok: false, reason: `Monthly AI limit reached (${ai.monthlyAiLimit}). Raise it in Settings.` }
  return { ok: true }
}

export function aiUsageThisMonth(settings: Settings): number {
  const month = dateKey().slice(0, 7)
  return settings.ai.usageMonth === month ? settings.ai.usageCount : 0
}

function recordAiUsage(): void {
  const ai = settingsStore.get().ai
  const month = dateKey().slice(0, 7)
  const used = ai.usageMonth === month ? ai.usageCount : 0
  settingsStore.set({ ai: { ...ai, usageMonth: month, usageCount: used + 1 } })
}

function extractJSON(text: string): any[] {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start === -1 || end === -1) return []
  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return []
  }
}

function toItems(raw: any[]): MealItem[] {
  return raw
    .filter((r) => r && typeof r === 'object')
    .map((r) => ({
      name: String(r.name ?? 'Item'),
      quantity: Number(r.quantity) || 1,
      unit: String(r.unit ?? 'serving'),
      grams: r.grams != null ? Number(r.grams) : undefined,
      calories: Math.max(0, Math.round(Number(r.calories) || 0)),
      protein: Math.max(0, Math.round(Number(r.protein) || 0)),
      carbs: Math.max(0, Math.round(Number(r.carbs) || 0)),
      fat: Math.max(0, Math.round(Number(r.fat) || 0)),
      fiber: r.fiber != null ? Math.max(0, Math.round(Number(r.fiber))) : undefined,
      source: 'ai' as const,
      confidence: r.confidence != null ? Number(r.confidence) : undefined,
    }))
}

interface ImagePart {
  mediaType: string
  base64: string
}

function splitDataUrl(dataUrl: string): ImagePart {
  const [meta, base64] = dataUrl.split(',')
  const mediaType = meta.match(/data:(.*?);/)?.[1] ?? 'image/jpeg'
  return { mediaType, base64: base64 ?? '' }
}

async function callClaude(settings: Settings, prompt: string, image?: ImagePart): Promise<any[]> {
  const content: any[] = [{ type: 'text', text: prompt }]
  if (image) content.unshift({ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } })
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': settings.ai.apiKey.trim(),
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 1024, messages: [{ role: 'user', content }] }),
  })
  if (!res.ok) throw new Error(`Claude error ${res.status}`)
  const data = await res.json()
  return extractJSON(data?.content?.[0]?.text ?? '')
}

async function callOpenAI(settings: Settings, prompt: string, image?: ImagePart): Promise<any[]> {
  const content: any[] = [{ type: 'text', text: prompt }]
  if (image) content.push({ type: 'image_url', image_url: { url: `data:${image.mediaType};base64,${image.base64}` } })
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${settings.ai.apiKey.trim()}` },
    body: JSON.stringify({ model: OPENAI_MODEL, max_tokens: 1024, messages: [{ role: 'user', content }] }),
  })
  if (!res.ok) throw new Error(`OpenAI error ${res.status}`)
  const data = await res.json()
  return extractJSON(data?.choices?.[0]?.message?.content ?? '')
}

async function run(settings: Settings, prompt: string, image?: ImagePart): Promise<MealItem[]> {
  const raw = settings.ai.provider === 'openai' ? await callOpenAI(settings, prompt, image) : await callClaude(settings, prompt, image)
  recordAiUsage()
  return toItems(raw)
}

/** Paid call — caller must confirm availability + intent first. */
export async function parseTextAI(text: string, settings: Settings): Promise<MealItem[]> {
  return run(settings, buildTextPrompt(text))
}

export async function analyzePhotoAI(dataUrl: string, settings: Settings): Promise<MealItem[]> {
  return run(settings, buildPhotoPrompt(), splitDataUrl(dataUrl))
}
