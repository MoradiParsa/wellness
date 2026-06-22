// ============================================================================
// Workout spreadsheet import — pure parsing & detection helpers (no React).
// Reads CSV / XLSX into a string matrix, auto-detects which column maps to each
// workout field, and groups rows into editable draft training days. The UI layer
// (SpreadsheetImport.tsx) handles review, editing, and committing to a Program.
// ============================================================================

import { uid } from './id'

export type ImportField =
  | 'day'
  | 'exercise'
  | 'muscleGroup'
  | 'sets'
  | 'reps'
  | 'weight'
  | 'rpe'
  | 'rest'
  | 'notes'

export const IMPORT_FIELDS: { key: ImportField; label: string; required?: boolean }[] = [
  { key: 'day', label: 'Workout day' },
  { key: 'exercise', label: 'Exercise', required: true },
  { key: 'muscleGroup', label: 'Muscle group' },
  { key: 'sets', label: 'Sets' },
  { key: 'reps', label: 'Reps' },
  { key: 'weight', label: 'Weight' },
  { key: 'rpe', label: 'RPE' },
  { key: 'rest', label: 'Rest' },
  { key: 'notes', label: 'Notes' },
]

// Header synonyms used for auto-detection. Order of fields below is the match
// priority, so e.g. "Workout Day" is claimed by `day` before `exercise`.
const SYNONYMS: Record<ImportField, string[]> = {
  day: ['day', 'workout day', 'training day', 'split', 'session', 'block'],
  exercise: ['exercise', 'exercise name', 'movement', 'lift', 'workout', 'name'],
  muscleGroup: ['muscle', 'muscle group', 'target', 'body part', 'group', 'category'],
  sets: ['sets', 'set', 'working sets', 'num sets'],
  reps: ['reps', 'rep', 'rep range', 'repetitions', 'target reps'],
  weight: ['weight', 'load', 'lbs', 'lb', 'kg', 'kgs', 'starting weight', 'working weight'],
  rpe: ['rpe', 'rir', 'intensity', 'effort'],
  rest: ['rest', 'rest time', 'rest seconds', 'recovery', 'rest period'],
  notes: ['notes', 'note', 'comment', 'comments', 'cue', 'cues', 'tempo'],
}

const FIELD_ORDER: ImportField[] = [
  'day',
  'exercise',
  'muscleGroup',
  'sets',
  'reps',
  'weight',
  'rpe',
  'rest',
  'notes',
]

export function normalizeHeader(s: string): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/** Score how well a normalized header matches a field's synonyms (0 = no match). */
function scoreHeader(header: string, synonyms: string[]): number {
  if (!header) return 0
  const words = header.split(' ')
  let best = 0
  for (const syn of synonyms) {
    if (header === syn) best = Math.max(best, 4)
    else if (words.includes(syn)) best = Math.max(best, 3)
    else if (header.startsWith(syn) || header.endsWith(syn)) best = Math.max(best, 2)
    // Only allow loose substring matches for longer tokens to avoid false hits.
    else if (syn.length >= 4 && header.includes(syn)) best = Math.max(best, 1)
  }
  return best
}

export type Mapping = Record<ImportField, number>

export function emptyMapping(): Mapping {
  return { day: -1, exercise: -1, muscleGroup: -1, sets: -1, reps: -1, weight: -1, rpe: -1, rest: -1, notes: -1 }
}

/** Best-effort column detection. Each column is claimed by at most one field. */
export function detectMapping(headers: string[]): Mapping {
  const norm = headers.map(normalizeHeader)
  const used = new Set<number>()
  const mapping = emptyMapping()
  for (const field of FIELD_ORDER) {
    let best = -1
    let bestScore = 0
    norm.forEach((h, i) => {
      if (used.has(i)) return
      const score = scoreHeader(h, SYNONYMS[field])
      if (score > bestScore) {
        bestScore = score
        best = i
      }
    })
    if (best >= 0) {
      mapping[field] = best
      used.add(best)
    }
  }
  return mapping
}

// ---- File reading ---------------------------------------------------------

/** Minimal RFC-4180 CSV parser (handles quotes, escaped quotes, CR/LF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  // Strip a leading UTF-8 BOM if present.
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** Coerce arbitrary cell values (xlsx returns string|number|Date|boolean|null) to text. */
export function toStringMatrix(rows: unknown[][]): string[][] {
  return rows.map((r) =>
    r.map((cell) => {
      if (cell == null) return ''
      if (cell instanceof Date) return cell.toLocaleDateString()
      return String(cell).trim()
    }),
  )
}

/** Drop fully-empty rows and find the header row (first with >= 2 non-empty cells). */
export function splitHeader(rows: string[][]): { headers: string[]; data: string[][] } {
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''))
  if (nonEmpty.length === 0) return { headers: [], data: [] }
  let headerIdx = 0
  for (let i = 0; i < nonEmpty.length; i++) {
    if (nonEmpty[i].filter((c) => c.trim() !== '').length >= 2) {
      headerIdx = i
      break
    }
  }
  return { headers: nonEmpty[headerIdx], data: nonEmpty.slice(headerIdx + 1) }
}

// ---- Value parsing --------------------------------------------------------

export function parseIntSafe(raw: string): number | null {
  const m = String(raw).match(/\d+/)
  return m ? parseInt(m[0], 10) : null
}

export function parseReps(raw: string): { low: number; high: number } {
  const nums = (String(raw).match(/\d+(?:\.\d+)?/g) || []).map(Number)
  if (nums.length === 0) return { low: 0, high: 0 }
  return { low: Math.round(Math.min(...nums)), high: Math.round(Math.max(...nums)) }
}

export function parseRpe(raw: string): number | null {
  const m = String(raw).match(/\d+(?:\.\d+)?/)
  if (!m) return null
  const v = parseFloat(m[0])
  if (!isFinite(v)) return null
  return Math.min(10, Math.max(1, v))
}

/** Returns rest in seconds. Understands "90", "90s", "2 min", "1:30". */
export function parseRest(raw: string): number | null {
  const s = String(raw).toLowerCase().trim()
  const clock = s.match(/(\d+):(\d+)/)
  if (clock) return parseInt(clock[1], 10) * 60 + parseInt(clock[2], 10)
  const m = s.match(/\d+(?:\.\d+)?/)
  if (!m) return null
  const num = parseFloat(m[0])
  if (!isFinite(num)) return null
  if (s.includes('min')) return Math.round(num * 60)
  return Math.round(num)
}

/** Returns a weight in the file's display unit; null if blank, 0 for bodyweight. */
export function parseWeight(raw: string): number | null {
  const s = String(raw).toLowerCase().trim()
  if (s === '') return null
  if (/\b(bw|bodyweight|body weight|none|n\/a)\b/.test(s)) return 0
  const m = s.match(/\d+(?:\.\d+)?/)
  return m ? parseFloat(m[0]) : null
}

export function normalizeExerciseName(s: string): string {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// ---- Drafts ---------------------------------------------------------------

export interface DraftExercise {
  id: string
  include: boolean
  exercise: string
  muscleGroup: string
  sets: string
  reps: string
  weight: string
  rpe: string
  rest: string
  notes: string
}

export interface DraftDay {
  id: string
  include: boolean
  name: string
  exercises: DraftExercise[]
}

/**
 * Group data rows into draft training days using the column mapping. The day
 * value is forward-filled so sheets that only label the first row of each day
 * still group correctly. Rows with no exercise name are skipped.
 */
export function buildDraftDays(data: string[][], mapping: Mapping): DraftDay[] {
  const cell = (row: string[], field: ImportField): string => {
    const idx = mapping[field]
    return idx >= 0 ? String(row[idx] ?? '').trim() : ''
  }

  const order: string[] = []
  const byDay = new Map<string, DraftDay>()
  let lastDay = ''

  for (const row of data) {
    const day = cell(row, 'day')
    if (day) lastDay = day
    const exercise = cell(row, 'exercise')
    if (!exercise) continue

    const key = lastDay || 'Day 1'
    if (!byDay.has(key)) {
      byDay.set(key, { id: uid(), include: true, name: key, exercises: [] })
      order.push(key)
    }
    byDay.get(key)!.exercises.push({
      id: uid(),
      include: true,
      exercise,
      muscleGroup: cell(row, 'muscleGroup'),
      sets: cell(row, 'sets'),
      reps: cell(row, 'reps'),
      weight: cell(row, 'weight'),
      rpe: cell(row, 'rpe'),
      rest: cell(row, 'rest'),
      notes: cell(row, 'notes'),
    })
  }

  return order.map((k) => byDay.get(k)!)
}
