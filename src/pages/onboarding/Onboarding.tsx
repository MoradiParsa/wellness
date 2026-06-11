import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Sparkles, Ruler, User, Target, Activity, Flame, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { settingsStore, weightsStore } from '@/data/collections'
import { PHASES, ACTIVITY_LEVELS, RATE_PRESETS } from '@/lib/constants'
import { fromDisplayWeight, inToCm, lbToKg } from '@/lib/format'
import { buildPlan, applyAutoPlan } from '@/coach/nutritionEngine'
import { uid } from '@/lib/id'
import { nowISO, todayKey } from '@/lib/date'
import type { Phase, UnitWeight, UnitLength, Sex, ActivityLevel, Settings } from '@/types'

const STEPS = ['welcome', 'units', 'stats', 'goal', 'activity', 'plan', 'program'] as const

export function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  const [name, setName] = useState('')
  const [weightUnit, setWeightUnit] = useState<UnitWeight>('lb')
  const [lengthUnit, setLengthUnit] = useState<UnitLength>('in')
  const [sex, setSex] = useState<Sex>('male')
  const [age, setAge] = useState('25')
  const [height, setHeight] = useState('70')
  const [currentWeight, setCurrentWeight] = useState('185')
  const [goalWeight, setGoalWeight] = useState('200')
  const [phase, setPhase] = useState<Phase>('bulk')
  const [rateIdx, setRateIdx] = useState(1)
  const [activity, setActivity] = useState<ActivityLevel>('moderate')
  const [trainingDays, setTrainingDays] = useState(4)

  const total = STEPS.length
  const next = () => setStep((s) => Math.min(total - 1, s + 1))
  const back = () => setStep((s) => Math.max(0, s - 1))

  const setPhaseSafe = (p: Phase) => {
    setPhase(p)
    setRateIdx(p === 'maintain' ? 0 : 1)
  }

  const heightCm = lengthUnit === 'in' ? inToCm(Number(height) || 70) : Number(height) || 178
  const currentKg = fromDisplayWeight(Number(currentWeight) || 185, weightUnit)
  const desiredRateKg = lbToKg(RATE_PRESETS[phase][rateIdx]?.lbPerWeek ?? 0)

  const previewSettings: Settings = {
    ...settingsStore.get(),
    units: { weight: weightUnit, length: lengthUnit },
    phase,
    goalWeight: fromDisplayWeight(Number(goalWeight) || 0, weightUnit),
    autoCalories: true,
    autoMacros: true,
    profile: {
      sex,
      age: Number(age) || 25,
      heightCm,
      activityLevel: activity,
      trainingDaysPerWeek: trainingDays,
      desiredRateKg,
    },
  }
  const plan = buildPlan(previewSettings, currentKg)

  const finish = (gotoProgram: boolean) => {
    settingsStore.set({
      name: name.trim() || undefined,
      units: { weight: weightUnit, length: lengthUnit },
      phase,
      goalWeight: fromDisplayWeight(Number(goalWeight) || 0, weightUnit),
      autoCalories: true,
      autoMacros: true,
      profile: previewSettings.profile,
      onboardingComplete: true,
    })
    // Seed the first weigh-in so the engine has a current weight to work from.
    if (weightsStore.getAll().length === 0) {
      weightsStore.add({
        id: uid(),
        date: todayKey(),
        weight: currentKg,
        fasted: true,
        timeOfDay: 'morning',
        createdAt: nowISO(),
      })
    }
    applyAutoPlan({ resetWeeklyBaseline: true })
    navigate(gotoProgram ? '/workout/program/new' : '/', { replace: true })
  }

  const key = STEPS[step]

  return (
    <div className="flex min-h-dvh flex-col bg-background px-6 pb-safe">
      <div className="safe-top flex items-center gap-3 pt-4">
        {step > 0 ? (
          <button onClick={back} className="flex size-9 items-center justify-center rounded-full bg-secondary tap-scale">
            <ChevronLeft className="size-5" />
          </button>
        ) : (
          <div className="size-9" />
        )}
        <div className="flex flex-1 items-center gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-foreground' : 'bg-secondary'}`} />
          ))}
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto py-8 no-scrollbar">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {key === 'welcome' && (
              <Step icon={<Sparkles className="size-7" />} title="Welcome to Progress OS" subtitle="Your personal coach for training, nutrition, and weight — it does the math so you don't have to.">
                <Field label="What should we call you? (optional)">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                </Field>
              </Step>
            )}

            {key === 'units' && (
              <Step icon={<Ruler className="size-7" />} title="Choose your units" subtitle="Change these anytime in Settings.">
                <div className="space-y-5">
                  <Field label="Body weight & lifts">
                    <SegmentedControl
                      layoutId="ob-weight"
                      value={weightUnit}
                      onChange={(v) => {
                        setWeightUnit(v)
                        setCurrentWeight(v === 'lb' ? '185' : '84')
                        setGoalWeight(v === 'lb' ? '200' : '90')
                      }}
                      options={[{ value: 'lb', label: 'Pounds (lb)' }, { value: 'kg', label: 'Kilograms (kg)' }]}
                    />
                  </Field>
                  <Field label="Height & measurements">
                    <SegmentedControl
                      layoutId="ob-length"
                      value={lengthUnit}
                      onChange={(v) => {
                        setLengthUnit(v)
                        setHeight(v === 'in' ? '70' : '178')
                      }}
                      options={[{ value: 'in', label: 'Inches (in)' }, { value: 'cm', label: 'Centimeters (cm)' }]}
                    />
                  </Field>
                </div>
              </Step>
            )}

            {key === 'stats' && (
              <Step icon={<User className="size-7" />} title="About you" subtitle="Used to estimate your maintenance calories. Stays on your device.">
                <div className="space-y-4">
                  <Field label="Sex (for metabolic estimate)">
                    <SegmentedControl
                      layoutId="ob-sex"
                      value={sex}
                      onChange={setSex}
                      options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Age">
                      <Input inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} />
                    </Field>
                    <Field label={`Height (${lengthUnit})`}>
                      <Input inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} />
                    </Field>
                  </div>
                  <Field label={`Current weight (${weightUnit})`}>
                    <Input inputMode="decimal" value={currentWeight} onChange={(e) => setCurrentWeight(e.target.value)} />
                  </Field>
                </div>
              </Step>
            )}

            {key === 'goal' && (
              <Step icon={<Target className="size-7" />} title="Your goal" subtitle="The coach adjusts calories weekly to keep you on pace.">
                <div className="space-y-4">
                  <Field label="Goal">
                    <SegmentedControl
                      layoutId="ob-phase"
                      value={phase}
                      onChange={setPhaseSafe}
                      options={PHASES.map((p) => ({ value: p.value, label: p.label }))}
                    />
                  </Field>
                  <Field label={`Goal weight (${weightUnit})`}>
                    <Input inputMode="decimal" value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)} />
                  </Field>
                  {phase !== 'maintain' && (
                    <Field label="Target pace">
                      <div className="space-y-2">
                        {RATE_PRESETS[phase].map((r, i) => (
                          <button
                            key={r.label}
                            onClick={() => setRateIdx(i)}
                            className={`w-full rounded-2xl border p-3.5 text-left tap-scale ${rateIdx === i ? 'border-foreground bg-secondary' : 'border-border bg-card'}`}
                          >
                            <span className="font-medium">{r.label}</span>
                          </button>
                        ))}
                      </div>
                    </Field>
                  )}
                </div>
              </Step>
            )}

            {key === 'activity' && (
              <Step icon={<Activity className="size-7" />} title="Activity level" subtitle="How active are you outside of logged workouts?">
                <div className="space-y-4">
                  <div className="space-y-2">
                    {ACTIVITY_LEVELS.map((a) => (
                      <button
                        key={a.value}
                        onClick={() => setActivity(a.value)}
                        className={`w-full rounded-2xl border p-3.5 text-left tap-scale ${activity === a.value ? 'border-foreground bg-secondary' : 'border-border bg-card'}`}
                      >
                        <p className="font-medium">{a.label}</p>
                        <p className="text-sm text-muted-foreground">{a.blurb}</p>
                      </button>
                    ))}
                  </div>
                  <Field label="Training days per week">
                    <SegmentedControl
                      layoutId="ob-days"
                      size="sm"
                      value={String(trainingDays)}
                      onChange={(v) => setTrainingDays(Number(v))}
                      options={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))}
                    />
                  </Field>
                </div>
              </Step>
            )}

            {key === 'plan' && (
              <Step icon={<Flame className="size-7" />} title="Your smart plan" subtitle="Calculated automatically — no manual targets to set.">
                <div className="space-y-4">
                  <div className="rounded-3xl border border-border bg-card p-5 text-center">
                    <p className="text-sm text-muted-foreground">Daily calories</p>
                    <p className="text-5xl font-bold tabular-nums">{plan.calories}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Maintenance ≈ {plan.tdee} kcal</p>
                    <div className="mt-4 grid grid-cols-4 gap-2 border-t border-border/70 pt-4 text-center">
                      <Macro label="Protein" value={`${plan.macros.protein}g`} />
                      <Macro label="Carbs" value={`${plan.macros.carbs}g`} />
                      <Macro label="Fat" value={`${plan.macros.fat}g`} />
                      <Macro label="Fiber" value={`${plan.macros.fiber}g`} />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-secondary/40 p-4">
                    <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold"><Sparkles className="size-4" /> Why these numbers</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{plan.caloriesRationale}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{plan.macrosRationale}</p>
                  </div>
                </div>
              </Step>
            )}

            {key === 'program' && (
              <Step icon={<ClipboardList className="size-7" />} title="Import your workout program" subtitle="Add your split day-by-day. It becomes the baseline for progressive-overload coaching. We won't force generic templates.">
                <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                  Build it now, or skip and add it later from the Workout tab.
                </div>
              </Step>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="space-y-2.5 pt-2">
        {key === 'program' ? (
          <>
            <Button size="lg" className="w-full" onClick={() => finish(true)}>Import my program</Button>
            <Button size="lg" variant="ghost" className="w-full" onClick={() => finish(false)}>Skip for now</Button>
          </>
        ) : key === 'plan' ? (
          <Button size="lg" className="w-full" onClick={next}>Looks good</Button>
        ) : (
          <Button size="lg" className="w-full" onClick={next}>Continue</Button>
        )}
      </div>
    </div>
  )
}

function Step({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <div>
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-secondary">{icon}</div>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>
      <div className="mt-7">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-base font-bold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}
