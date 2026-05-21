/**
 * copa.vite.config.js — Build standalone do Bolão Copa 2026
 *
 * Uso:
 *   npm run build:copa        → gera dist-copa/ (deploy separado)
 *   npm run dev:copa          → dev server standalone na porta 5174
 *
 * Resultado pode ser deployado em qualquer CDN/Cloudflare Pages separado.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: '.',
  base: '/',
  build: {
    outDir: 'dist-copa',
    emptyOutDir: true,
    rollupOptions: {
      input: 'copa.html',
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'react';
          if (id.includes('node_modules/firebase')) return 'firebase';
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 5174,
    // SPA fallback para rota /copa?share=...
    historyApiFallback: true,
  },
  plugins: [react()],
});
