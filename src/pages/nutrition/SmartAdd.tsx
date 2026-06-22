import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Mic, MicOff, Sparkles, Plus, Loader2, Copy, Check, History, Star, Bookmark, ScanLine, Search, BadgeCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
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
import { useMealLibrary } from '@/hooks/useMealLibrary'
import { useVerifiedFoods } from '@/hooks/useVerifiedFoods'
import {
  parseAndResolve,
  resolveBarcode,
  searchProducts,
  addVerifiedFood,
  verifiedFoodItem,
  sumItems,
  aiAvailability,
  aiUsageThisMonth,
  analyzePhotoAI,
  buildPhotoPrompt,
} from '@/services/nutrition'
import type { LabelFacts } from '@/services/nutrition/label'
import { MEAL_TYPES } from '@/lib/constants'
import { todayKey } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { MealItem, MealType } from '@/types'

type Mode = 'describe' | 'barcode' | 'label' | 'photo'

const LABEL_FIELDS: { key: keyof LabelFacts; label: string; suffix?: string }[] = [
  { key: 'calories', label: 'Calories' },
  { key: 'protein', label: 'Protein', suffix: 'g' },
  { key: 'carbs', label: 'Carbs', suffix: 'g' },
  { key: 'fat', label: 'Fat', suffix: 'g' },
  { key: 'fiber', label: 'Fiber', suffix: 'g' },
  { key: 'sugar', label: 'Sugar', suffix: 'g' },
  { key: 'sodium', label: 'Sodium', suffix: 'mg' },
  { key: 'servingGrams', label: 'Serving', suffix: 'g' },
  { key: 'servingsPerContainer', label: 'Servings/container' },
]

function QuickRow({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" /> {title}
      </p>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">{children}</div>
    </div>
  )
}

function FoodChip({
  item,
  fav,
  onAdd,
  onToggleFav,
}: {
  item: MealItem
  fav: boolean
  onAdd: () => void
  onToggleFav: () => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-card py-1 pl-3 pr-1 text-[13px] font-medium">
      <button onClick={onAdd} className="flex items-center gap-1.5 tap-scale">
        {item.name}
        <span className="text-muted-foreground">{item.calories}</span>
      </button>
      <button onClick={onToggleFav} className="flex size-6 items-center justify-center rounded-full active:bg-secondary" aria-label="Toggle favorite">
        <Star className={cn('size-3.5', fav ? 'fill-warning text-warning' : 'text-muted-foreground/50')} />
      </button>
    </div>
  )
}

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
  const lib = useMealLibrary()
  const { verifiedFoods } = useVerifiedFoods()

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

  // Branded product search (the "show close matches and choose" flow)
  const [showSearch, setShowSearch] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MealItem[]>([])
  const [searching, setSearching] = useState(false)

  // Nutrition-label OCR
  const [labelPhoto, setLabelPhoto] = useState<string | undefined>()
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [labelForm, setLabelForm] = useState<Record<string, string>>({})
  const [labelName, setLabelName] = useState('')
  const [labelBrand, setLabelBrand] = useState('')

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
        // cache the scanned product locally as a verified food
        if (item.grams && item.grams > 0) {
          const k = 100 / item.grams
          addVerifiedFood({
            name: item.name,
            brand: item.brand,
            per100g: {
              calories: Math.round(item.calories * k),
              protein: Math.round(item.protein * k),
              carbs: Math.round(item.carbs * k),
              fat: Math.round(item.fat * k),
              fiber: Math.round((item.fiber ?? 0) * k),
            },
            servingGrams: item.unit === 'serving' ? item.grams : undefined,
            barcode: barcode.trim(),
          })
        }
        toast.success('Product found & saved to My Foods')
        setBarcode('')
      } else toast.error('Product not found in OpenFoodFacts.')
    } finally {
      setLoading(false)
    }
  }

  const runProductSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const r = await searchProducts(query.trim())
      setResults(r)
      if (r.length === 0) toast.error('No branded matches found.')
    } finally {
      setSearching(false)
    }
  }

  const scanLabel = async () => {
    if (!labelPhoto) return
    setScanning(true)
    try {
      const { scanNutritionLabel } = await import('@/services/nutrition/label')
      const facts = await scanNutritionLabel(labelPhoto)
      const form: Record<string, string> = {}
      for (const f of LABEL_FIELDS) {
        const v = facts[f.key]
        if (typeof v === 'number') form[f.key] = String(v)
      }
      setLabelForm(form)
      setScanned(true)
      const got = Object.keys(form).length
      toast.success(got ? `Read ${got} values — check & edit below` : 'Could not read much — enter manually')
    } catch {
      setScanned(true)
      toast.error('OCR failed — enter the values manually.')
    } finally {
      setScanning(false)
    }
  }

  const saveLabelFood = () => {
    const n = (k: string) => {
      const v = Number(labelForm[k])
      return isFinite(v) ? v : 0
    }
    const cal = n('calories')
    if (!labelName.trim() || cal <= 0) {
      toast.error('Add a food name and calories first.')
      return
    }
    const sg = n('servingGrams') > 0 ? n('servingGrams') : undefined
    const k = sg ? 100 / sg : 1
    const v = addVerifiedFood({
      name: labelName.trim(),
      brand: labelBrand.trim() || undefined,
      per100g: {
        calories: Math.round(cal * k),
        protein: Math.round(n('protein') * k),
        carbs: Math.round(n('carbs') * k),
        fat: Math.round(n('fat') * k),
        fiber: Math.round(n('fiber') * k),
      },
      servingGrams: sg,
      sugar: n('sugar') || undefined,
      sodium: n('sodium') || undefined,
    })
    append([verifiedFoodItem(v)])
    toast.success(`Saved "${v.name}" to My Foods`)
    setLabelPhoto(undefined)
    setScanned(false)
    setLabelForm({})
    setLabelName('')
    setLabelBrand('')
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

  const saveAsMeal = () => {
    const filled = items.filter((i) => i.name.trim())
    if (filled.length === 0) {
      toast.error('Add at least one food first.')
      return
    }
    const name = mealName.trim() || filled[0].name || 'Meal'
    lib.saveMealTemplate(name, filled, mealType)
    toast.success(`Saved "${name}" — tap it next time to log in one tap`)
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
          { value: 'barcode', label: 'Barcode' },
          { value: 'label', label: 'Label' },
          { value: 'photo', label: 'Photo' },
        ]}
      />

      {mode === 'describe' && (
        <div className="space-y-3">
          {verifiedFoods.length > 0 && (
            <QuickRow icon={BadgeCheck} title="My Foods · verified">
              {verifiedFoods.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    append([verifiedFoodItem(v)])
                    toast.success(`Added ${v.name}`)
                  }}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-success/40 bg-card px-3 py-1.5 text-[13px] font-medium tap-scale active:bg-secondary"
                >
                  {v.name}
                  <span className="text-muted-foreground">{v.per100g.calories && v.servingGrams ? Math.round((v.per100g.calories * v.servingGrams) / 100) : v.per100g.calories}</span>
                </button>
              ))}
            </QuickRow>
          )}

          {lib.savedMeals.length > 0 && (
            <QuickRow icon={Bookmark} title="Saved meals">
              {lib.savedMeals.map((sm) => (
                <button
                  key={sm.id}
                  onClick={() => {
                    append(sm.items.map((i) => ({ ...i })))
                    setMealName(sm.name)
                    if (sm.mealType) setMealType(sm.mealType)
                    toast.success(`Added ${sm.name}`)
                  }}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-medium tap-scale active:bg-secondary"
                >
                  {sm.name}
                  <span className="text-muted-foreground">{sumItems(sm.items).calories}</span>
                </button>
              ))}
            </QuickRow>
          )}

          {lib.favorites.length > 0 && (
            <QuickRow icon={Star} title="Favorites">
              {lib.favorites.map((f) => (
                <FoodChip key={f.id} item={f.item} fav onAdd={() => append([{ ...f.item }])} onToggleFav={() => lib.toggleFavorite(f.item)} />
              ))}
            </QuickRow>
          )}

          {recents.length > 0 && (
            <QuickRow icon={History} title="Recent · tap to add">
              {recents.map((r, i) => (
                <FoodChip key={i} item={r} fav={lib.isFavorite(r)} onAdd={() => append([{ ...r }])} onToggleFav={() => lib.toggleFavorite(r)} />
              ))}
            </QuickRow>
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

          <button onClick={() => setShowSearch((v) => !v)} className="flex w-full items-center justify-center gap-1.5 px-1 pt-1 text-xs font-medium text-muted-foreground">
            <Search className="size-3.5" /> Wrong match? Search branded products
          </button>
          {showSearch && (
            <div className="space-y-2 rounded-2xl border border-border/70 bg-secondary/30 p-3">
              <div className="flex gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), runProductSearch())}
                  placeholder="e.g. Nature's Own Butter Bread"
                  className="h-10"
                />
                <Button size="sm" onClick={runProductSearch} disabled={searching || !query.trim()}>
                  {searching ? <Loader2 className="size-4 animate-spin" /> : 'Search'}
                </Button>
              </div>
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => {
                    append([{ ...r }])
                    toast.success(`Added ${r.name}`)
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 text-left active:bg-secondary"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{r.name}</span>
                    {r.brand && <span className="block truncate text-xs text-muted-foreground">{r.brand}</span>}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{r.calories} kcal</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === 'label' && (
        <div className="space-y-3">
          <PhotoPicker value={labelPhoto} onChange={(p) => { setLabelPhoto(p); setScanned(false) }} />
          {labelPhoto && !scanned && (
            <Button className="w-full" onClick={scanLabel} disabled={scanning}>
              {scanning ? <Loader2 className="size-4 animate-spin" /> : <ScanLine className="size-4" />}
              Scan nutrition label
            </Button>
          )}
          {scanned && (
            <div className="space-y-3 rounded-2xl border border-border/70 bg-secondary/30 p-4">
              <div className="space-y-2">
                <Label>Food name</Label>
                <Input value={labelName} onChange={(e) => setLabelName(e.target.value)} placeholder="e.g. Butter Bread" />
              </div>
              <div className="space-y-2">
                <Label>Brand (optional)</Label>
                <Input value={labelBrand} onChange={(e) => setLabelBrand(e.target.value)} placeholder="e.g. Nature's Own" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {LABEL_FIELDS.map((f) => (
                  <label key={f.key} className="flex flex-col gap-1">
                    <span className="px-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                      {f.label}
                      {f.suffix ? ` (${f.suffix})` : ''}
                    </span>
                    <input
                      value={labelForm[f.key] ?? ''}
                      onChange={(e) => setLabelForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      inputMode="decimal"
                      className="h-9 rounded-lg border border-border/70 bg-background px-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/50"
                    />
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Values are per serving — add the serving grams so amounts scale correctly.
              </p>
              <Button className="w-full" onClick={saveLabelFood}>
                <BadgeCheck className="size-4" /> Save to My Foods &amp; add
              </Button>
            </div>
          )}
          <p className="px-1 text-xs text-muted-foreground">
            Point at the Nutrition Facts panel (not the plate). Free on-device OCR — the first scan downloads the
            recognizer (~few MB), then works offline.
          </p>
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
                    <Button variant="secondary" size="sm" onClick={copyPrompt}><Copy className="size-4" /> Copy AI Estimate Prompt</Button>
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
            <Button variant="secondary" size="sm" className="w-full" onClick={saveAsMeal}>
              <Bookmark className="size-4" /> Save as a reusable meal
            </Button>
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
