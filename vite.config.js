import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: "all",
    proxy: {
      '/api': {
        target: 'https://arkad-tool.onrender.com',
        changeOrigin: true,
      }
    }
  }
})