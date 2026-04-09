import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Změň na '/nazev-repa/' pokud se repo jmenuje jinak
  base: '/swampsound-system/',
})
