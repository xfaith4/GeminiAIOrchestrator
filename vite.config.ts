import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// If deploying under a subpath (e.g., GitHub Pages at /AI-Orchestration/),
// set BASE_PATH to that subpath; otherwise it stays '/'.
const base = process.env.BASE_PATH || '/'

export default defineConfig({
  plugins: [react()],
  base, // prevents 404 "assets/index-*.js not found" when not at root
})
