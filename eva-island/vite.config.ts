import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The EVA chat "island": a separate React 19 app (so it can use @economic/agents-react,
// which wants React 19) embedded in the main React-18/taco prototype via an <iframe>.
// Built into the main app's public/ folder so it's served at /eva/eva-island/.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: '../public/eva-island',
    emptyOutDir: true,
  },
})
