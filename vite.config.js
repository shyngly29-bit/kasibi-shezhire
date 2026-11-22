import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// base './' — сайт GitHub Pages-тің кез келген адресінде жұмыс істейді
// '@' — src папкасына сілтеме (shadcn стиліндегі импорттар үшін: '@/components/ui/...')
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
})
