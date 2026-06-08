import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Served from https://<user>.github.io/eva/ — assets must resolve under /eva/.
  base: '/eva/',
  plugins: [react()],
  css: {
    transformer: 'postcss',
  },
  build: {
    cssMinify: false,
  },
})
