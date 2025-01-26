import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/TabooGame/', // Update this to match your repository name
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
})
