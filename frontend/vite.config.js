import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://35.154.148.96:8080',
        changeOrigin: true
      },
      '/ws': {
        target: 'http://35.154.148.96:8080',
        changeOrigin: true,
        ws: true
      }
    }
  }
})
