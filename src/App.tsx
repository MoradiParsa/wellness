import { useEffect, useRef } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { BottomNav } from '@/components/layout/BottomNav'
import { showBottomNav } from '@/components/layout/navConfig'
import { Toaster, toast } from '@/components/ui/sonner'
import { settingsStore } from '@/data/collections'
import { useSettings } from '@/hooks/useSettings'
import { maybeWeeklyAdjust } from '@/coach/nutritionEngine'

import { Dashboard } from '@/pages/Dashboard'
import { Analytics } from '@/pages/Analytics'
import { Progress } from '@/pages/Progress'
import { Onboarding } from '@/pages/onboarding/Onboarding'
import { Settings } from '@/pages/settings/Settings'
import { MoreMenuPage } from '@/pages/settings/MoreMenuPage'
import { DataManagement } from '@/pages/settings/DataManagement'
import { WorkoutHome } from '@/pages/workout/WorkoutHome'
import { ProgramImportWizard } from '@/pages/workout/ProgramImportWizard'
import { ProgramEditor } from '@/pages/workout/ProgramEditor'
import { ActiveSession } from '@/pages/workout/ActiveSession'
import { ExerciseLibrary } from '@/pages/workout/ExerciseLibrary'
import { ExerciseDetail } from '@/pages/workout/ExerciseDetail'
import { WorkoutHistory } from '@/pages/workout/WorkoutHistory'
import { NutritionDay } from '@/pages/nutrition/NutritionDay'
import { SmartAdd } from '@/pages/nutrition/SmartAdd'
import { MealEditor } from '@/pages/nutrition/MealEditor'
import { MealHistory } from '@/pages/nutrition/MealHistory'
import { WeightHome } from '@/pages/weight/WeightHome'
import { WeightEntryForm } from '@/pages/weight/WeightEntryForm'
import { WeightHistory } from '@/pages/weight/WeightHistory'
import { TaskList } from '@/pages/tasks/TaskList'

export function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const { settings } = useSettings()
  const restored = useRef(false)

  // First-run onboarding gate.
  useEffect(() => {
    if (!settings.onboardingComplete && location.pathname !== '/onboarding') {
      navigate('/onboarding', { replace: true })
    }
  }, [settings.onboardingComplete, location.pathname, navigate])

  // Restore the last opened tab once on launch.
  useEffect(() => {
    if (restored.current) return
    restored.current = true
    const s = settingsStore.get()
    if (s.onboardingComplete && location.pathname === '/' && s.lastRoute && s.lastRoute !== '/') {
      navigate(s.lastRoute, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Remember the last opened tab.
  useEffect(() => {
    if (showBottomNav(location.pathname)) {
      settingsStore.set({ lastRoute: location.pathname })
    }
  }, [location.pathname])

  // Weekly smart-calorie auto-adjustment (self-gates to once per 7 days).
  useEffect(() => {
    if (!settingsStore.get().onboardingComplete) return
    const adj = maybeWeeklyAdjust()
    if (adj) {
      toast('Calories adjusted', {
        description: adj.reason,
        duration: 8000,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-md overflow-x-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/onboarding" element={<Onboarding />} />

          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />

          <Route path="/workout" element={<WorkoutHome />} />
          <Route path="/workout/program/new" element={<ProgramImportWizard />} />
          <Route path="/workout/program/:id/edit" element={<ProgramEditor />} />
          <Route path="/workout/session/:dayId" element={<ActiveSession />} />
          <Route path="/workout/session" element={<ActiveSession />} />
          <Route path="/workout/exercises" element={<ExerciseLibrary />} />
          <Route path="/workout/exercise/:id" element={<ExerciseDetail />} />
          <Route path="/workout/history" element={<WorkoutHistory />} />

          <Route path="/nutrition" element={<NutritionDay />} />
          <Route path="/nutrition/add" element={<SmartAdd />} />
          <Route path="/nutrition/meal/new" element={<MealEditor />} />
          <Route path="/nutrition/meal/:id" element={<MealEditor />} />
          <Route path="/nutrition/history" element={<MealHistory />} />

          <Route path="/weight" element={<WeightHome />} />
          <Route path="/weight/new" element={<WeightEntryForm />} />
          <Route path="/weight/:id" element={<WeightEntryForm />} />
          <Route path="/weight/history" element={<WeightHistory />} />

          <Route path="/tasks" element={<TaskList />} />
          <Route path="/progress" element={<Progress />} />

          <Route path="/more" element={<MoreMenuPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/data" element={<DataManagement />} />

          <Route path="*" element={<Dashboard />} />
        </Routes>
      </AnimatePresence>

      {showBottomNav(location.pathname) && <BottomNav />}
      <Toaster />
    </div>
  )
}
