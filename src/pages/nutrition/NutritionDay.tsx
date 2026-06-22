import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  UtensilsCrossed,
  Droplet,
  History,
  Trash2,
  Repeat2,
} from 'lucide-react'
import type { Meal } from '@/types'
import { TabPage } from '@/components/layout/TabPage'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { MetricRing } from '@/components/shared/MetricRing'
import { EmptyState } from '@/components/shared/EmptyState'
import { CoachCard } from '@/components/shared/CoachCard'
import { toast } from '@/components/ui/sonner'
import { useNutrition } from '@/hooks/useNutrition'
import { useSettings } from '@/hooks/useSettings'
import { useCollection } from '@/data/store'
import { adjustmentsStore } from '@/data/collections'
import { todayKey, addDaysKey, formatPretty, isToday, daysAgo } from '@/lib/date'
import { formatGrams, formatWater, toDisplayWater, waterUnit, WATER_GLASS_ML, clamp } from '@/lib/format'

export function NutritionDay() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const [date, setDate] = useState(todayKey())
  const { meals, totals, water, addWater, removeMeal, saveMeal, addMeal } = useNutrition(date)

  const repeatMeal = (m: Meal) => {
    addMeal({
      date,
      name: m.name,
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
      fiber: m.fiber,
      mealType: m.mealType,
      photo: m.photo,
      notes: m.notes,
      items: m.items ? m.items.map((i) => ({ ...i })) : undefined,
    })
    toast.success(`Repeated ${m.name}`)
  }
  const adjustments = useCollection(adjustmentsStore)
  const recentAdjustment = [...adjustments]
    .sort((a, b) => b.date.localeCompare(a.date))
    .find((a) => daysAgo(a.date) <= 7)

  const calRemaining = Math.round(settings.calorieTarget - totals.calories)

  return (
    <TabPage
      title="Nutrition"
      right={
        <Button size="iconSm" variant="secondary" onClick={() => navigate('/nutrition/history')}>
          <History />
        </Button>
      }
    >
      <div className="mb-4 flex items-center justify-between rounded-full bg-secondary/60 p-1">
        <button onClick={() => setDate(addDaysKey(date, -1))} className="flex size-9 items-center justify-center rounded-full active:bg-background">
          <ChevronLeft className="size-5" />
        </button>
        <span className="text-sm font-semibold">{isToday(date) ? 'Today' : formatPretty(date)}</span>
        <button
          onClick={() => !isToday(date) && setDate(addDaysKey(date, 1))}
          className="flex size-9 items-center justify-center rounded-full active:bg-background disabled:opacity-30"
          disabled={isToday(date)}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {recentAdjustment && isToday(date) && (
        <CoachCard
          className="mb-4"
          message={{ id: recentAdjustment.id, title: 'Calories auto-adjusted', body: recentAdjustment.reason, tone: 'warning' }}
        />
      )}

      <Card className="mb-4">
        <CardContent className="flex items-center gap-5 p-5">
          <MetricRing value={totals.calories} max={settings.calorieTarget} size={128} strokeWidth={12}>
            <span className="text-3xl font-bold tabular-nums leading-none">{Math.abs(calRemaining)}</span>
            <span className="mt-1 text-xs text-muted-foreground">{calRemaining >= 0 ? 'left' : 'over'}</span>
          </MetricRing>
          <div className="flex-1 space-y-2 text-sm">
            <Line label="Eaten" value={`${Math.round(totals.calories)} kcal`} />
            <Line label="Target" value={`${settings.calorieTarget} kcal`} />
            <Line label="Remaining" value={`${calRemaining} kcal`} strong />
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <MacroCard label="Protein" value={totals.protein} target={settings.proteinTarget} indicatorClass="bg-success" />
        <MacroCard label="Carbs" value={totals.carbs} target={settings.carbTarget} indicatorClass="bg-[hsl(217_91%_60%)]" />
        <MacroCard label="Fat" value={totals.fat} target={settings.fatTarget} indicatorClass="bg-warning" />
        <MacroCard label="Fiber" value={totals.fiber} target={settings.fiberTarget} indicatorClass="bg-[hsl(280_65%_60%)]" />
      </div>

      <Card className="mb-5">
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Droplet className="size-4 text-[hsl(217_91%_60%)]" /> Water
            </span>
            <span className="text-sm tabular-nums text-muted-foreground">
              {formatWater(water, settings)} / {Math.round(toDisplayWater(settings.waterTarget, settings))} {waterUnit(settings)}
            </span>
          </div>
          <Progress
            value={clamp((water / Math.max(1, settings.waterTarget)) * 100, 0, 100)}
            indicatorClassName="bg-[hsl(217_91%_60%)]"
            className="mb-3"
          />
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => addWater(WATER_GLASS_ML)}>
              + Glass
            </Button>
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => addWater(WATER_GLASS_ML * 2)}>
              + Bottle
            </Button>
            {water > 0 && (
              <Button variant="ghost" size="sm" onClick={() => addWater(-WATER_GLASS_ML)}>
                Undo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Meals</span>
      </div>

      {meals.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title={isToday(date) ? 'Nothing logged yet' : 'No meals this day'}
          description={
            isToday(date)
              ? `You've got ${calRemaining} kcal to work with today. Log a meal by typing, speaking, or snapping a photo.`
              : 'Nothing was logged on this day.'
          }
          action={
            isToday(date) ? (
              <Button onClick={() => navigate(`/nutrition/add?date=${date}`)}>
                <Plus className="size-4" /> Add food
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {meals.map((m) => (
            <div key={m.id} className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card p-3">
              <button onClick={() => navigate(`/nutrition/meal/${m.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                {m.photo ? (
                  <img src={m.photo} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-secondary">
                    <UtensilsCrossed className="size-5 text-muted-foreground" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{m.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {Math.round(m.calories)} kcal · {formatGrams(m.protein)}P · {formatGrams(m.carbs)}C · {formatGrams(m.fat)}F
                  </span>
                  {m.items && m.items.length > 0 && (
                    <span className="block truncate text-[11px] text-muted-foreground/80">
                      {m.items.length} food{m.items.length > 1 ? 's' : ''}{m.time ? ` · ${m.time}` : ''}
                    </span>
                  )}
                </span>
              </button>
              <button
                onClick={() => repeatMeal(m)}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground active:bg-secondary"
                aria-label="Repeat meal"
                title="Log this again"
              >
                <Repeat2 className="size-4" />
              </button>
              <button
                onClick={() => {
                  removeMeal(m.id)
                  toast('Meal deleted', { action: { label: 'Undo', onClick: () => saveMeal(m) } })
                }}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground active:bg-secondary"
                aria-label="Delete meal"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <Button variant="outline" className="w-full" onClick={() => navigate(`/nutrition/add?date=${date}`)}>
            <Plus className="size-4" /> Add food
          </Button>
        </div>
      )}
    </TabPage>
  )
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? 'font-semibold' : 'tabular-nums'}>{value}</span>
    </div>
  )
}

function MacroCard({
  label,
  value,
  target,
  indicatorClass,
}: {
  label: string
  value: number
  target: number
  indicatorClass: string
}) {
  const remaining = Math.max(0, Math.round(target - value))
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{remaining}g left</span>
      </div>
      <p className="mb-2 text-xl font-bold tabular-nums">
        {Math.round(value)}
        <span className="text-sm font-normal text-muted-foreground"> / {Math.round(target)}g</span>
      </p>
      <Progress value={target > 0 ? Math.min(100, (value / target) * 100) : 0} indicatorClassName={indicatorClass} />
    </div>
  )
}
