import { defineConfig } from 'vite'
import react from '@vitejs/react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: false // Vi bruker vår egen manifest.json i public-mappen
    })
  ],
  base: './',
})
