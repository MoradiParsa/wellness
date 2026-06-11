import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Moon,
  Database,
  Cloud,
  Check,
  Pencil,
  Flame,
  Info,
  ChevronDown,
  HeartPulse,
} from 'lucide-react'
import { TabPage } from '@/components/layout/TabPage'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { ListGroup, ListRow } from '@/components/shared/List'
import { useSettings } from '@/hooks/useSettings'
import { usePrograms } from '@/hooks/usePrograms'
import { buildPlan, applyAutoPlan, currentWeightKg } from '@/coach/nutritionEngine'
import { PHASES, ACTIVITY_LEVELS, RATE_PRESETS } from '@/lib/constants'
import {
  toDisplayWeight,
  fromDisplayWeight,
  toDisplayLength,
  fromDisplayLength,
  toDisplayWater,
  fromDisplayWater,
  waterUnit,
  lbToKg,
  kgToLb,
} from '@/lib/format'
import { dateKey } from '@/lib/date'
import type { Phase, UnitWeight, UnitLength, Sex, ActivityLevel, AiProvider } from '@/types'

function NumberBox({ value, onCommit, suffix, decimals = 0 }: { value: number; onCommit: (n: number) => void; suffix?: string; decimals?: number }) {
  return (
    <div className="relative">
      <Input
        key={value}
        type="number"
        inputMode="decimal"
        defaultValue={Number(value.toFixed(decimals))}
        onBlur={(e) => onCommit(Number(e.target.value) || 0)}
        className="pr-12 text-right font-semibold"
      />
      {suffix && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{suffix}</span>}
    </div>
  )
}

export function Settings() {
  const navigate = useNavigate()
  const { settings, update } = useSettings()
  const { programs } = usePrograms()
  const u = settings.units.weight
  const plan = buildPlan(settings)
  const [showWhy, setShowWhy] = useState(false)

  const setDark = (on: boolean) => {
    update({ darkMode: on })
    document.documentElement.classList.toggle('dark', on)
  }

  // Deliberate changes recompute the base plan and reset the weekly cycle.
  const recompute = () => applyAutoPlan({ resetWeeklyBaseline: true })
  const setProfile = (patch: Partial<typeof settings.profile>) => {
    update({ profile: { ...settings.profile, ...patch } })
    recompute()
  }
  const setPhase = (p: Phase) => {
    const presets = RATE_PRESETS[p]
    update({ phase: p, profile: { ...settings.profile, desiredRateKg: lbToKg(presets[Math.min(1, presets.length - 1)].lbPerWeek) } })
    recompute()
  }
  const setRate = (lbPerWeek: number) => setProfile({ desiredRateKg: lbToKg(lbPerWeek) })

  const ai = settings.ai
  const setAi = (patch: Partial<typeof settings.ai>) => update({ ai: { ...settings.ai, ...patch } })
  const usageThisMonth = ai.usageMonth === dateKey().slice(0, 7) ? ai.usageCount : 0

  const rateLbNow = Number(kgToLb(settings.profile.desiredRateKg).toFixed(2))

  return (
    <TabPage title="Settings" subtitle="Progress OS">
      {/* Appearance */}
      <Card className="mb-5">
        <CardContent className="p-2">
          <div className="flex items-center justify-between gap-3 px-3 py-3">
            <span className="flex items-center gap-3"><Moon className="size-5 text-muted-foreground" /><span className="text-[15px] font-medium">Dark mode</span></span>
            <Switch checked={settings.darkMode} onCheckedChange={setDark} />
          </div>
        </CardContent>
      </Card>

      {/* Smart nutrition plan */}
      <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Smart nutrition</p>
      <Card className="mb-3">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-[15px] font-medium"><Flame className="size-4" /> Auto-calculate calories</span>
            <Switch
              checked={settings.autoCalories}
              onCheckedChange={(on) => {
                update({ autoCalories: on })
                if (on) applyAutoPlan({ resetWeeklyBaseline: true })
              }}
            />
          </div>

          {settings.autoCalories ? (
            <div className="rounded-2xl bg-secondary/40 p-4 text-center">
              <p className="text-4xl font-bold tabular-nums">{settings.calorieTarget}</p>
              <p className="text-xs text-muted-foreground">kcal/day · maintenance ≈ {plan.tdee}</p>
              <button onClick={() => setShowWhy((v) => !v)} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Info className="size-3.5" /> Why this number <ChevronDown className={`size-3.5 transition-transform ${showWhy ? 'rotate-180' : ''}`} />
              </button>
              {showWhy && (
                <p className="mt-2 text-left text-xs leading-relaxed text-muted-foreground">{plan.caloriesRationale}</p>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground">Auto-adjusts weekly from your 7-day weight trend.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Calorie target</Label>
              <NumberBox value={settings.calorieTarget} suffix="kcal" onCommit={(n) => update({ calorieTarget: n })} />
            </div>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
            <span className="text-[15px] font-medium">Auto-calculate macros</span>
            <Switch
              checked={settings.autoMacros}
              onCheckedChange={(on) => {
                update({ autoMacros: on })
                if (on) applyAutoPlan()
              }}
            />
          </div>

          {settings.autoMacros ? (
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              <MacroChip label="Protein" value={settings.proteinTarget} />
              <MacroChip label="Carbs" value={settings.carbTarget} />
              <MacroChip label="Fat" value={settings.fatTarget} />
              <MacroChip label="Fiber" value={settings.fiberTarget} />
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Protein (g)"><NumberBox value={settings.proteinTarget} onCommit={(n) => update({ proteinTarget: n })} /></Field>
              <Field label="Carbs (g)"><NumberBox value={settings.carbTarget} onCommit={(n) => update({ carbTarget: n })} /></Field>
              <Field label="Fat (g)"><NumberBox value={settings.fatTarget} onCommit={(n) => update({ fatTarget: n })} /></Field>
              <Field label="Fiber (g)"><NumberBox value={settings.fiberTarget} onCommit={(n) => update({ fiberTarget: n })} /></Field>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goal */}
      <Card className="mb-3">
        <CardContent className="space-y-4 p-4">
          <Field label="Goal / phase">
            <SegmentedControl layoutId="set-phase" value={settings.phase} onChange={setPhase} options={PHASES.map((p) => ({ value: p.value, label: p.label }))} />
          </Field>
          {settings.phase !== 'maintain' && (
            <Field label="Target pace">
              <Select value={String(rateLbNow)} onValueChange={(v) => setRate(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RATE_PRESETS[settings.phase].map((r) => {
                    const disp = toDisplayWeight(lbToKg(r.lbPerWeek), u).toFixed(2)
                    return (
                      <SelectItem key={r.lbPerWeek} value={String(r.lbPerWeek)}>
                        {r.label.split(' (')[0]} · {disp} {u}/wk
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </Field>
          )}
          <div className="flex items-center justify-between gap-3">
            <Label className="shrink-0">Goal weight</Label>
            <div className="w-40"><NumberBox value={toDisplayWeight(settings.goalWeight, u)} decimals={1} suffix={u} onCommit={(n) => update({ goalWeight: fromDisplayWeight(n, u) })} /></div>
          </div>
        </CardContent>
      </Card>

      {/* Body profile */}
      <Card className="mb-3">
        <CardContent className="space-y-4 p-4">
          <Field label="Sex (metabolic estimate)">
            <SegmentedControl layoutId="set-sex" value={settings.profile.sex} onChange={(v: Sex) => setProfile({ sex: v })} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age"><NumberBox value={settings.profile.age} onCommit={(n) => setProfile({ age: n })} /></Field>
            <Field label={`Height (${settings.units.length})`}>
              <NumberBox value={toDisplayLength(settings.profile.heightCm, settings.units.length)} suffix={settings.units.length} onCommit={(n) => setProfile({ heightCm: fromDisplayLength(n, settings.units.length) })} />
            </Field>
          </div>
          <Field label="Activity level">
            <Select value={settings.profile.activityLevel} onValueChange={(v) => setProfile({ activityLevel: v as ActivityLevel })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIVITY_LEVELS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Training days / week">
            <SegmentedControl layoutId="set-days" size="sm" value={String(settings.profile.trainingDaysPerWeek)} onChange={(v) => setProfile({ trainingDaysPerWeek: Number(v) })} options={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))} />
          </Field>
        </CardContent>
      </Card>

      {/* Units */}
      <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Units & water</p>
      <Card className="mb-5">
        <CardContent className="space-y-4 p-4">
          <Field label="Body weight & lifts">
            <SegmentedControl layoutId="set-weight" value={u} onChange={(v: UnitWeight) => update({ units: { ...settings.units, weight: v } })} options={[{ value: 'lb', label: 'lb' }, { value: 'kg', label: 'kg' }]} />
          </Field>
          <Field label="Measurements">
            <SegmentedControl layoutId="set-length" value={settings.units.length} onChange={(v: UnitLength) => update({ units: { ...settings.units, length: v } })} options={[{ value: 'in', label: 'in' }, { value: 'cm', label: 'cm' }]} />
          </Field>
          <div className="flex items-center justify-between gap-3">
            <Label className="shrink-0">Water target</Label>
            <div className="w-40"><NumberBox value={toDisplayWater(settings.waterTarget, settings)} suffix={waterUnit(settings)} onCommit={(n) => update({ waterTarget: fromDisplayWater(n, settings) })} /></div>
          </div>
        </CardContent>
      </Card>

      {/* AI & Data */}
      <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">AI & food data</p>
      <Card className="mb-2">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[15px] font-medium">Enable paid AI features</p>
              <p className="text-xs text-muted-foreground">Off by default. Photo & language parsing use free tools unless this is on.</p>
            </div>
            <Switch checked={ai.paidAiEnabled} onCheckedChange={(on) => setAi({ paidAiEnabled: on })} />
          </div>

          {ai.paidAiEnabled && (
            <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
              <div className="flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-xs text-warning">
                <Info className="mt-0.5 size-4 shrink-0" />
                <span>Paid calls use your own API key and bill your provider account. The app warns you before each call and stops at your monthly limit.</span>
              </div>
              <Field label="Provider">
                <SegmentedControl layoutId="ai-provider" value={ai.provider} onChange={(v: AiProvider) => setAi({ provider: v })} options={[{ value: 'claude', label: 'Claude' }, { value: 'openai', label: 'OpenAI' }]} />
              </Field>
              <Field label={`${ai.provider === 'claude' ? 'Anthropic' : 'OpenAI'} API key`}>
                <Input type="password" placeholder="sk-…" value={ai.apiKey} onChange={(e) => setAi({ apiKey: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Monthly call limit"><NumberBox value={ai.monthlyAiLimit} onCommit={(n) => setAi({ monthlyAiLimit: n })} /></Field>
                <div className="space-y-2">
                  <Label>Used this month</Label>
                  <div className="flex h-12 items-center rounded-xl border border-input bg-secondary/40 px-4 font-semibold tabular-nums">{usageThisMonth} / {ai.monthlyAiLimit}</div>
                </div>
              </div>
              <Field label="Proxy URL (optional, future)">
                <Input placeholder="https://your-proxy.example.com" value={ai.proxyUrl} onChange={(e) => setAi({ proxyUrl: e.target.value })} />
              </Field>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="mb-5">
        <CardContent className="space-y-3 p-4">
          <Field label="USDA FoodData Central key (free, optional)">
            <Input placeholder="DEMO_KEY" value={ai.usdaKey} onChange={(e) => setAi({ usdaKey: e.target.value })} />
          </Field>
          <p className="text-xs text-muted-foreground">
            Get a free key at <span className="text-foreground">fdc.nal.usda.gov/api-key-signup</span>. OpenFoodFacts (barcodes & brands) is always free — no key needed.
          </p>
        </CardContent>
      </Card>

      {/* Program */}
      <ListGroup title="Workout program">
        {programs.length === 0 && <ListRow label="Import a program" sublabel="Build your split to unlock coaching" chevron onClick={() => navigate('/workout/program/new')} />}
        {programs.map((p) => (
          <ListRow
            key={p.id}
            label={p.name}
            sublabel={`${p.days.length} training days`}
            right={settings.activeProgramId === p.id ? <Check className="size-5 text-success" /> : <button onClick={() => update({ activeProgramId: p.id })} className="text-sm font-medium text-muted-foreground">Set active</button>}
          />
        ))}
        {programs.length > 0 && <ListRow icon={Pencil} label="Edit active program" chevron onClick={() => settings.activeProgramId && navigate(`/workout/program/${settings.activeProgramId}/edit`)} />}
      </ListGroup>

      <ListGroup title="Data">
        <ListRow icon={Database} label="Export, import & reset" chevron onClick={() => navigate('/settings/data')} />
      </ListGroup>

      <ListGroup title="Future integrations">
        <ListRow icon={HeartPulse} iconClassName="bg-secondary text-muted-foreground" label="Apple Health · Garmin · Google Fit" sublabel="Auto-import steps, active calories & sleep into your TDEE" value="Soon" />
        <ListRow icon={Cloud} iconClassName="bg-secondary text-muted-foreground" label="Cloud sync (Supabase / Firebase)" sublabel="Back up and sync across devices" value="Soon" />
      </ListGroup>

      <p className="px-1 pb-4 text-center text-xs text-muted-foreground">
        Progress OS · v2.0 · Latest weigh-in used for estimates: {Number(toDisplayWeight(currentWeightKg(), u).toFixed(1))} {u}
      </p>
    </TabPage>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>
}

function MacroChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-secondary/50 py-2">
      <p className="text-base font-bold tabular-nums">{value}g</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}
