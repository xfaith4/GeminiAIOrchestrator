// ### BEGIN FILE: vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Note: We don't read secrets here for the client. Use import.meta.env in browser code.
export default defineConfig({
  plugins: [react()],
  define: {
    // Safety net so stray process.env reads in client code don't crash.
    'process.env': {},
  },
})
// ### END FILE: vite.config.ts
