import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/baustellenbegehung-app/',  // exakt der Repo-Name
  publicDir: 'public',               // Standard: statische Assets
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
