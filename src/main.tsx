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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
