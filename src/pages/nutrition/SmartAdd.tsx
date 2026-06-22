import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Mic, MicOff, Sparkles, Plus, Loader2, Copy, Check, History } from 'lucide-react'
import { FullScreenPage } from '@/components/layout/FullScreenPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { PhotoPicker } from '@/components/shared/PhotoPicker'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { MealItemsEditor, blankFoodItem } from '@/components/nutrition/MealItemsEditor'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { toast } from '@/components/ui/sonner'
import { useSettings } from '@/hooks/useSettings'
import { useNutrition } from '@/hooks/useNutrition'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useRecentFoods } from '@/hooks/useRecentFoods'
import {
  parseAndResolve,
  resolveBarcode,
  sumItems,
  aiAvailability,
  aiUsageThisMonth,
  analyzePhotoAI,
  buildPhotoPrompt,
} from '@/services/nutrition'
import { MEAL_TYPES } from '@/lib/constants'
import { todayKey } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { MealItem, MealType } from '@/types'

type Mode = 'describe' | 'photo' | 'barcode'

function parsePastedAI(text: string): MealItem[] {
  try {
    const a = text.indexOf('[')
    const b = text.lastIndexOf(']')
    const arr = JSON.parse(text.slice(a, b + 1)) as any[]
    return arr.map((r) => ({
      name: String(r.name ?? 'Item'),
      quantity: Number(r.quantity) || 1,
      unit: String(r.unit ?? 'serving'),
      grams: r.grams != null ? Number(r.grams) : undefined,
      calories: Math.round(Number(r.calories) || 0),
      protein: Math.round(Number(r.protein) || 0),
      carbs: Math.round(Number(r.carbs) || 0),
      fat: Math.round(Number(r.fat) || 0),
      fiber: r.fiber != null ? Math.round(Number(r.fiber)) : undefined,
      source: 'ai' as const,
      confidence: r.confidence != null ? Number(r.confidence) : undefined,
    }))
  } catch {
    return []
  }
}

export function SmartAdd() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const date = params.get('date') ?? todayKey()
  const { settings } = useSettings()
  const { addMeal } = useNutrition(date)
  const speech = useSpeechRecognition()
  const recents = useRecentFoods()

  const [mode, setMode] = useState<Mode>('describe')
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState<string | undefined>()
  const [barcode, setBarcode] = useState('')
  const [pasteBox, setPasteBox] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirmPaid, setConfirmPaid] = useState(false)

  const [items, setItems] = useState<MealItem[]>([])
  const [mealName, setMealName] = useState('')
  const [mealType, setMealType] = useState<MealType>('lunch')

  useEffect(() => {
    if (speech.transcript) setText(speech.transcript)
  }, [speech.transcript])

  const totals = sumItems(items)
  const ai = aiAvailability(settings)
  const append = (more: MealItem[]) => setItems((prev) => [...prev, ...more])

  const analyzeText = async () => {
    if (!text.trim()) return
    setLoading(true)
    try {
      const resolved = await parseAndResolve(text, settings)
      if (resolved.length === 0) toast.error("Couldn't find any foods — add them manually below.")
      else {
        append(resolved)
        toast.success(`Added ${resolved.length} item${resolved.length > 1 ? 's' : ''}`)
      }
      setText('')
    } finally {
      setLoading(false)
    }
  }

  const lookupBarcodeNow = async () => {
    if (!barcode.trim()) return
    setLoading(true)
    try {
      const item = await resolveBarcode(barcode.trim())
      if (item) {
        append([item])
        toast.success('Product found')
        setBarcode('')
      } else toast.error('Product not found in OpenFoodFacts.')
    } finally {
      setLoading(false)
    }
  }

  const runPaidPhoto = async () => {
    if (!photo) return
    setLoading(true)
    try {
      const result = await analyzePhotoAI(photo, settings)
      if (result.length) {
        append(result)
        toast.success('Photo analyzed')
      } else toast.error('No foods detected — add them manually.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const copyPrompt = async () => {
    await navigator.clipboard?.writeText(buildPhotoPrompt())
    setShowPaste(true)
    toast.success('Prompt copied — paste it with your photo into Claude, then paste the result back here.')
  }

  const importPasted = () => {
    const parsed = parsePastedAI(pasteBox)
    if (parsed.length) {
      append(parsed)
      setPasteBox('')
      setShowPaste(false)
      toast.success(`Imported ${parsed.length} items`)
    } else toast.error('Could not read that JSON.')
  }

  const save = () => {
    const filled = items.filter((i) => i.name.trim() && (i.calories > 0 || i.protein > 0 || i.carbs > 0 || i.fat > 0))
    if (filled.length === 0) {
      toast.error('Add at least one food with nutrition.')
      return
    }
    const sum = sumItems(filled)
    addMeal({
      date,
      name: mealName.trim() || filled[0].name || 'Meal',
      calories: sum.calories,
      protein: sum.protein,
      carbs: sum.carbs,
      fat: sum.fat,
      fiber: sum.fiber,
      mealType,
      photo,
      items: filled,
    })
    toast.success('Meal logged')
    navigate(-1)
  }

  return (
    <FullScreenPage
      title="Add food"
      noSwipe
      footer={
        items.length > 0 ? (
          <Button size="lg" className="w-full" onClick={save}>
            Log meal · {totals.calories} kcal
          </Button>
        ) : undefined
      }
    >
      <SegmentedControl
        className="mb-4"
        layoutId="smartadd-mode"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'describe', label: 'Describe' },
          { value: 'photo', label: 'Photo' },
          { value: 'barcode', label: 'Barcode' },
        ]}
      />

      {mode === 'describe' && (
        <div className="space-y-3">
          {recents.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <History className="size-3.5" /> Recent · tap to add
              </p>
              <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
                {recents.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => append([{ ...r }])}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-medium tap-scale active:bg-secondary"
                  >
                    {r.name}
                    <span className="text-muted-foreground">{r.calories}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  analyzeText()
                }
              }}
              placeholder='e.g. "100g chicken breast, 250g white rice, 1 tbsp olive oil and 2 eggs"'
              className="min-h-[104px] pr-14"
            />
            <button
              onClick={() => (speech.listening ? speech.stop() : speech.start())}
              className={cn(
                'absolute bottom-3 right-3 flex size-10 items-center justify-center rounded-full transition-colors',
                speech.listening ? 'animate-pulse bg-destructive text-destructive-foreground' : 'bg-foreground text-background',
              )}
              title={speech.supported ? 'Dictate' : 'Voice not supported in this browser'}
            >
              {speech.listening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </button>
          </div>
          {!speech.supported && (
            <p className="px-1 text-xs text-muted-foreground">
              Live voice isn't available here. On iPhone, tap the box and use your keyboard's 🎤 dictation key — same result.
            </p>
          )}
          <Button className="w-full" onClick={analyzeText} disabled={loading || !text.trim()}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Analyze
          </Button>
          <p className="px-1 text-xs text-muted-foreground">Free &amp; instant — matched against the food database. No AI charges.</p>
        </div>
      )}

      {mode === 'photo' && (
        <div className="space-y-3">
          <PhotoPicker value={photo} onChange={setPhoto} />
          {photo && (
            <>
              {ai.ok ? (
                <Button className="w-full" onClick={() => setConfirmPaid(true)} disabled={loading}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  Analyze with AI
                </Button>
              ) : (
                <div className="rounded-2xl border border-border/70 bg-secondary/40 p-3.5">
                  <p className="text-xs text-muted-foreground">{ai.reason}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Use the free route — your photo is saved either way:</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button variant="secondary" size="sm" onClick={copyPrompt}><Copy className="size-4" /> Copy AI prompt</Button>
                    <Button variant="secondary" size="sm" onClick={() => append([blankFoodItem()])}><Plus className="size-4" /> Enter manually</Button>
                  </div>
                </div>
              )}
              {showPaste && (
                <div className="space-y-2">
                  <Label>Paste Claude's JSON result</Label>
                  <Textarea value={pasteBox} onChange={(e) => setPasteBox(e.target.value)} placeholder="[ { …items… } ]" />
                  <Button variant="secondary" className="w-full" onClick={importPasted}><Check className="size-4" /> Import result</Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {mode === 'barcode' && (
        <div className="space-y-3">
          <Label>Barcode number</Label>
          <div className="flex gap-2">
            <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} inputMode="numeric" placeholder="e.g. 0123456789012" />
            <Button onClick={lookupBarcodeNow} disabled={loading || !barcode.trim()}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : 'Look up'}
            </Button>
          </div>
          <p className="px-1 text-xs text-muted-foreground">Free lookup via OpenFoodFacts. Type the number under the barcode.</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-6">
          <MealItemsEditor items={items} onChange={setItems} label="Review" />
          <div className="mt-4 space-y-3 rounded-2xl border border-border/70 bg-secondary/30 p-4">
            <div className="space-y-2">
              <Label>Meal name</Label>
              <Input value={mealName} onChange={(e) => setMealName(e.target.value)} placeholder={items[0]?.name || 'Meal'} />
            </div>
            <SegmentedControl size="sm" layoutId="smartadd-meal" value={mealType} onChange={setMealType} options={MEAL_TYPES.map((m) => ({ value: m.value, label: m.label }))} />
          </div>
        </div>
      )}

      <AlertDialog open={confirmPaid} onOpenChange={setConfirmPaid}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Use a paid AI call?</AlertDialogTitle>
            <AlertDialogDescription>
              This sends the photo to {settings.ai.provider === 'claude' ? 'Claude' : 'OpenAI'} and bills your API key.
              You've used {aiUsageThisMonth(settings)} of {settings.ai.monthlyAiLimit} this month.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              className="bg-primary text-primary-foreground"
              onClick={() => {
                setConfirmPaid(false)
                runPaidPhoto()
              }}
            >
              Analyze (1 call)
            </AlertDialogAction>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FullScreenPage>
  )
}
