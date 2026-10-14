import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'Middagsplan & Matvarelager',
        short_name: 'MatApp',
        description: '100% offline ukesmeny, dynamisk handleliste og matvarelager med holdbarhetsvarsling.',
        theme_color: '#1e3a8a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Handleliste (Handlemann)',
            short_name: 'Handleliste',
            description: 'Åpne handlelisten direkte i butikken',
            url: './?tab=shopping',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'Ukesmeny',
            short_name: 'Ukesmeny',
            description: 'Se ukens middagsplan',
            url: './?tab=planner',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'Matvarelager',
            short_name: 'Lager',
            description: 'Oversikt over holdbarhet og råvarer',
            url: './?tab=pantry',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'Ny oppskrift',
            short_name: 'Ny oppskrift',
            description: 'Legg til ny middag i arkivet',
            url: './?tab=recipes&action=new',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ]
});
