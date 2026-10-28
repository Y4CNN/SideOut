import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

// Pour GitHub Pages, définir BASE_PATH="/nom-du-depot/" au moment du build.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    { name: 'exclude-original-artwork', closeBundle: { order: 'pre', handler() {
      rmSync(resolve('dist/images/source'), { recursive: true, force: true });
      for (const file of ['pwa-192.png', 'pwa-512.png', 'pwa-maskable-512.png', 'apple-touch-icon.png', 'favicon.svg']) rmSync(resolve('dist', file), { force: true });
    } } },
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['images/favicon.ico'],
      manifest: {
        id: base,
        name: 'Arbitre Volley',
        short_name: 'Arbitre Volley',
        description: "Gestion de match de volley-ball en direct pour l'arbitre (règles FIVB / FFVB).",
        lang: 'fr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#06142f',
        theme_color: '#0A2A66',
        categories: ['sports', 'utilities'],
        icons: [
          { src: 'images/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'images/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'images/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,avif,woff2,webmanifest}'],
        globIgnores: ['**/images/source/**'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
