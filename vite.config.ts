import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'
import fs from 'node:fs'

// Public base path. On GitHub Actions, GITHUB_REPOSITORY is "owner/repo":
//  - project site  -> served at "/<repo>/"
//  - user/org site -> repo named "<user>.github.io" is served at "/"
// Locally (dev/preview) it falls back to "/". Override with VITE_BASE if needed.
function resolveBase(): string {
  if (process.env.VITE_BASE) return process.env.VITE_BASE
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
  if (!repo) return '/'
  return repo.endsWith('.github.io') ? '/' : `/${repo}/`
}
const base = resolveBase()

// GitHub Pages has no SPA rewrite and runs Jekyll by default. Copying index.html
// to 404.html makes deep links resolve to the app; .nojekyll disables Jekyll.
function ghPagesFallback() {
  return {
    name: 'gh-pages-fallback',
    closeBundle() {
      const dist = path.resolve(__dirname, 'dist')
      const index = path.join(dist, 'index.html')
      if (fs.existsSync(index)) fs.copyFileSync(index, path.join(dist, '404.html'))
      fs.writeFileSync(path.join(dist, '.nojekyll'), '')
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Shipped as a single offline-first bundle (precached by the service worker),
  // so the default 500 kB chunk advisory is expected here.
  build: { chunkSizeWarningLimit: 1200 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'Progress OS',
        short_name: 'Progress',
        description: 'Premium personal fitness, nutrition, weight & habit tracker.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        scope: base,
        start_url: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
    ghPagesFallback(),
  ],
})
