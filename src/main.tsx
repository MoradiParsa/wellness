import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { App } from './App'
import { ensureSeeded } from './data/seed'
import { settingsStore } from './data/collections'

// Seed the exercise library on first run and apply the theme before first paint.
ensureSeeded()
document.documentElement.classList.toggle('dark', settingsStore.get().darkMode)

// Strip the trailing slash so React Router gets "/repo" (or "" at the root).
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
