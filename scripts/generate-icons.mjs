import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const src = resolve(__dirname, 'icon.svg')
const iconsDir = resolve(root, 'public/icons')
mkdirSync(iconsDir, { recursive: true })

const targets = [
  { file: 'public/icons/icon-192.png', size: 192 },
  { file: 'public/icons/icon-512.png', size: 512 },
  { file: 'public/icons/icon-512-maskable.png', size: 512 },
  { file: 'public/apple-touch-icon.png', size: 180 },
]

for (const t of targets) {
  await sharp(src)
    .resize(t.size, t.size)
    .png()
    .toFile(resolve(root, t.file))
  console.log('wrote', t.file)
}
