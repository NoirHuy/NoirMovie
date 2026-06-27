import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:7860',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:7860',
        ws: true,
        changeOrigin: true,
        secure: false,
      }
    }
  }
})