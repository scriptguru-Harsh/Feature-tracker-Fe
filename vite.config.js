import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' makes the build work on any static host or sub-folder
export default defineConfig({
  base: './',
  plugins: [react()],
  optimizeDeps: { include: ['sql.js'] },
})
