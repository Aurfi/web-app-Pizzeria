import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Admin-specific Vite configuration
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-admin',
    rollupOptions: {
      input: {
        admin: './admin.html'
      }
    }
  },
  server: {
    port: 5174,
    host: '0.0.0.0'
  },
  define: {
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:3001')
  }
})