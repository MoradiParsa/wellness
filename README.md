# Progress OS

A premium, mobile-first **Progressive Web App** for personal fitness, progressive
overload, weight, nutrition, food-photo logging, daily tasks, and habits. Dark, minimal,
iPhone-style. **100% offline** — everything is stored locally in your browser, no backend,
no login, no accounts.

Built with React + TypeScript + Vite, TailwindCSS, shadcn-style UI, Framer Motion,
React Router, React Hook Form + Zod, and Recharts.

---

## How to run

```bash
npm install        # install dependencies
npm run dev        # start the dev server  → http://localhost:5173
npm run build      # type-check + production build into /dist
npm run preview    # serve the production build locally
```

Open the dev URL on your phone (same Wi-Fi, use your computer's LAN IP, e.g.
`http://192.168.1.20:5173`) to feel it on a real device.

---

## How to use it

On first launch a quick **setup** captures your units, body stats (sex, age, height, current &
goal weight), goal/phase, target pace, activity level, and training frequency — then **computes
your calories and macros for you** (no manual targets) and offers to import your program.

- **Dashboard** — a **Daily Coach** card (today's calories + macros, weight trend, today's
  workout, and a coaching line), plus weight, calories/protein remaining, streak, tasks, and
  quick-add buttons.
- **Workout**
  - **Import Workout Program** — build your own split day-by-day: per exercise set the
    sets, rep range, starting weight, target RPE/RIR, rest, tempo, and notes. This program is
    saved as your active baseline (no generic templates are forced on you).
  - **Import from a spreadsheet** — upload a CSV or Excel (`.xlsx`) export of an existing plan
    (Workout → empty state, the import wizard, or More → Workout). It auto-detects columns
    (Day, Exercise, Muscle Group, Sets, Reps, Weight, RPE, Rest, Notes) in any order, then lets
    you review and edit every day and row before saving. If a column can't be matched it shows a
    quick column-mapping screen, and nothing is saved until you tap **Commit Workout Plan**.
  - **Start workout** — the home screen suggests the next day in your rotation. Logging shows
    your **previous performance** and the **progressive-overload suggestion** inline, with a
    rest timer between sets.
  - **Exercise library / detail** — browse 40+ built-in exercises (or add your own); each
    detail page shows estimated-1RM trend, PRs, and full history.
  - **History** — every saved session with volume and best sets.
- **Nutrition** — per-day calories + protein/carbs/fat/fiber rings, water tracker, and a meal
  list. Log food the fast way via **Smart Add** (see below) or manually, with photos.
- **Weight** — log weight, body-fat %, muscle %, water %, fasted, morning/evening, notes, and a
  progress photo. See 7- & 30-day averages, weekly/monthly change, trend chart, goal weight,
  **projected goal date**, and bulk/cut coaching.
- **Tasks** (under **More**) — Today / Upcoming / Overdue / Completed filters, categories
  (Fitness, Nutrition, Personal, Habits), priority, due dates, and recurring tasks.
- **Analytics** (under **More**) — workout consistency, weekly volume, strength PRs, weight
  trend, nutrition averages, task completion, and streaks.
- **Settings** (under **More**) — dark mode, the **Smart Nutrition** plan (auto calories/macros
  with override toggles), body profile, goal & pace, units, the **AI & food data** panel,
  active program, **export / import / reset**, and future-integration notes.

Navigation is iOS-native: a 5-tab bottom bar (Home / Workout / Nutrition / Weight / **More**),
a full-screen More menu, last-page memory, and swipe-back on detail screens. Everything
autosaves instantly.

---

## Smart Nutrition Coach (free-first, no surprise costs)

The nutrition system thinks for you, and by default **never makes a paid API call**.

- **Smart Calorie Engine** — from your stats it estimates maintenance (Mifflin–St Jeor BMR ×
  activity) and sets your starting calories (bulk = surplus, cut = deficit, maintain), showing
  exactly **why**. You never type a calorie goal.
- **Weekly auto-adjust** — once a week it compares your **7-day average** weight change to your
  target pace and nudges calories by 100–200 kcal (never aggressive), with a written
  explanation, e.g. *"Your 7-day average weight changed 0.05 lb/wk vs the 0.50 lb/wk target.
  Daily calories increased from 3,090 to 3,290."*
- **Smart macros** — protein from body weight & goal, fat ≈ 25% of calories, carbs from the
  remainder, fiber from total calories. Auto by default; flip a switch to override.
- **Smart Add food logging** — three modes:
  - **Describe** (type *or* tap the 🎤 to dictate): a local parser reads quantities/units
    (`100g chicken breast, 250g rice, 1 tbsp olive oil and 2 eggs`) and resolves nutrition from
    a **free** source — a built-in common-foods database first, then **USDA FoodData Central**,
    then **OpenFoodFacts**. Instant, offline-capable, **no AI charges**.
  - **Photo** — saves the meal photo and lets you enter macros manually. If you opt into paid
    AI it can auto-analyze; otherwise it gives you a one-tap **"Copy AI prompt"** to paste into
    Claude yourself and paste the result back. Free either way.
  - **Barcode** — type the number for a free OpenFoodFacts lookup.
  - Every result lands in an **editable review list** before saving.
- **Paid AI is opt-in and guarded.** In Settings → *AI & food data*, **"Enable paid AI" is OFF
  by default.** When on, you add your own API key (Claude or OpenAI), the app **warns before
  each call**, counts usage, and **stops at your monthly limit** — and always prefers the free
  database first. Voice uses the **free** browser speech API. (USDA needs a free key —
  `fdc.nal.usda.gov/api-key-signup`; OpenFoodFacts needs none.)

> Note: the smart lookups need an internet connection; the rest of the app (and manual logging)
> stays fully offline.

---

## The coaches

- **Progressive Overload** — after each set, compares your reps & effort against your program
  target: cleared the top of the range comfortably → add weight; hit it but it was a grind →
  repeat; missed reps → back off. Tracks est. 1RM (Epley), volume (total/weekly/monthly), best
  set, PRs, and strength trends.
- **Bulk / Cut** — reads your weight trend (rolling averages + regression slope): stalled bulk →
  "+200 kcal", gaining too fast → trim slightly, good pace → "the plan is working", and flags
  **body recomposition** when strength climbs while weight holds steady.

---

## Install on iPhone (as a PWA)

1. Open the app's URL in **Safari** on your iPhone.
2. Tap the **Share** button (square with an up arrow).
3. Tap **Add to Home Screen**, then **Add**.
4. Launch it from the new **Progress OS** icon — it runs full-screen, standalone, and offline,
   just like a native app (safe-area insets, black status bar, no browser chrome).

> Best results when served over HTTPS (service workers require a secure context). `localhost`
> also counts as secure for testing. Deploy `/dist` to any static host (Vercel, Netlify,
> GitHub Pages, Cloudflare Pages) to install it over HTTPS.

---

## Deploy free on GitHub Pages

This repo is wired to publish itself to GitHub Pages — free, HTTPS, fully installable. Your
tracked data never leaves your browser, so the public repo only contains the app's code.

1. **Create a repo on GitHub** and push this project to its `main` branch.
2. In the repo, go to **Settings → Pages → Build and deployment → Source** and choose
   **GitHub Actions**.
3. That's it. Every push to `main` runs `.github/workflows/deploy.yml`, which builds the app and
   publishes it. Your live URL appears under **Settings → Pages** (e.g.
   `https://<username>.github.io/<repo>/`).
4. Open that URL in Safari on your iPhone and **Add to Home Screen** (steps above).

The base path is derived automatically from the repo name at build time (`vite.config.ts` reads
`GITHUB_REPOSITORY`), so it works whatever you name the repo — including a root
`<username>.github.io` site. To build locally for a project subpath, pass the base explicitly:
`VITE_BASE=/<repo>/ npm run build`.

---

## What's complete

Everything in the spec is functional — no dead placeholder screens (the only "coming soon"
items are the intentionally-stubbed future integrations below):

✅ Dashboard + **Daily Coach** · ✅ Workout tracker + Import Program wizard · ✅ Progressive
Overload coach · ✅ **Smart Calorie Engine** · ✅ **Weekly auto-adjust** · ✅ **Smart macros** ·
✅ **Voice / text / photo / barcode food logging** (free-first) · ✅ Weight tracker + projections
· ✅ Bulk/Cut coach · ✅ Task manager (recurring) · ✅ Analytics · ✅ Settings · ✅ Export /
Import / Reset · ✅ Offline PWA + iOS install · ✅ Imperial/metric unit switching.

---

## Turning on (optional) paid AI food analysis

It's already built — just opt in:

1. Settings → **AI & food data** → toggle **Enable paid AI features** on.
2. Pick **Claude** or **OpenAI** and paste your own API key (it's stored only on your device).
3. Set a **monthly call limit**. The app warns before every call and stops at the limit.
4. In **Smart Add → Photo**, "Analyze with AI" now works; it still prefers the free database for
   text/voice. Default models are the cheapest vision-capable ones (`claude-haiku-4-5`,
   `gpt-4o-mini`) — change them in `src/services/nutrition/ai.ts`.

The provider calls live in `src/services/nutrition/ai.ts`; the free database + parser pipeline is
in the same folder (`foods.ts`, `parse.ts`, `providers.ts`, `index.ts`) and is fully modular.

## Adding Apple Health / Garmin / Google Fit later

`src/services/health/index.ts` defines a provider-agnostic `HealthProvider` interface with no-op
stubs and an `activeCaloriesForTDEE(date)` hook, ready to fold active calories into the TDEE
estimate once a native wrapper or OAuth provider is implemented — no UI changes required.

## Adding a cloud backend later

Persistence is isolated behind a single adapter in `src/lib/storage.ts` (`StorageAdapter`).
Implement the same interface against **Supabase** or **Firebase** and swap the exported
`storage` — the reactive store, repositories, hooks, and screens are untouched. `src/data/
migrate.ts` already provides JSON export/import for migrating existing data.

---

## Project structure

```
src/
  lib/        utils, storage adapter, dates, unit formatting, image compression
  types/      domain models (profile, AI settings, meal items, adjustments…)
  data/       reactive store, collections, exercise seed, export/import
  coach/      overload, metrics, bulk-cut phase, nutritionEngine (TDEE/macros/weekly-adjust), dailyCoach
  services/   nutrition/ (foods, parse, providers, ai, resolver), health/ (integration stubs)
  hooks/      settings, exercises, programs, workouts, nutrition, weight, tasks, speech-recognition
  components/ ui (shadcn-style), layout (nav/shell), shared, charts, workout, tasks
  pages/      dashboard, workout/*, nutrition/* (incl. SmartAdd), weight/*, tasks/*, settings/*, onboarding, analytics
```
