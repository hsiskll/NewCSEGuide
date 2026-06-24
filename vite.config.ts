import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'CSEGuide - UPSC CSE Study Companion',
          short_name: 'CSEGuide',
          description: 'Personal UPSC CSE smart reader and study companion with direct Gemini AI features.',
          theme_color: '#0B132B',
          background_color: '#0B132B',
          display: 'standalone',
          orientation: 'portrait-primary',
          icons: [
            {
              src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="192" height="192"><rect width="512" height="512" rx="100" fill="%230B132B"/><path d="M150 150 L362 150 L362 200 L280 200 L280 362 L220 362 L220 200 L150 200 Z" fill="%23C9A227"/></svg>',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><rect width="512" height="512" rx="100" fill="%230B132B"/><path d="M150 150 L362 150 L362 200 L280 200 L280 362 L220 362 L220 200 L150 200 Z" fill="%23C9A227"/></svg>',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          cleanupOutdatedCaches: true
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
