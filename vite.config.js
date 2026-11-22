import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' — сайт GitHub Pages-тің кез келген адресінде жұмыс істейді
export default defineConfig({
  base: './',
  plugins: [react()],
})
