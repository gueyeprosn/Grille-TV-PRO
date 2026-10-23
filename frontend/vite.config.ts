import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'logo.png'],
      manifest: {
        name: 'GrilleTV Pro - Broadcast SN+',
        short_name: 'GrilleTV Pro',
        description: 'Application professionnelle de gestion de grilles TV pour Broadcast SN+',
        theme_color: '#0B1220',
        background_color: '#0B1220',
        display: 'standalone',
        orientation: 'any',
        scope: '/grille/',
        start_url: '/grille/',
        icons: [
          {
            src: '/grille/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/grille/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Aujourd\'hui',
            short_name: 'Aujourd\'hui',
            description: 'Voir les programmes d\'aujourd\'hui',
            url: '/grille/?view=today',
            icons: [{ src: '/grille/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'ON AIR',
            short_name: 'ON AIR',
            description: 'Voir le programme en direct',
            url: '/grille/?view=onair',
            icons: [{ src: '/grille/icon-192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60 // 5 minutes
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 jours
              }
            }
          }
        ]
      }
    })
  ],
  base: '/grille/',
  server: {
    port: 5173,
    proxy: { 
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false
      },
      '/grille/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    // Optimisations pour la production
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Désactiver les sourcemaps en production pour la sécurité
    minify: 'esbuild', // Utiliser esbuild (plus rapide et inclus par défaut)
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['lucide-react', 'react-hot-toast'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})



