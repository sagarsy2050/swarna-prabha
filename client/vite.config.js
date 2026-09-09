import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// `VITE_BASE` lets the same build serve from a sub-path (GitHub Pages project
// site: "/swarna-prabha/") or the root ("/"). Local dev stays "/".
const base = process.env.VITE_BASE || '/';

// Dev proxy sends /api, /uploads and /jewellery-images to the local API so the
// SPA can use same-origin relative URLs in development.
export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(process.cwd(), 'src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.VITE_API_URL || 'http://localhost:4000', changeOrigin: true },
      '/uploads': { target: process.env.VITE_API_URL || 'http://localhost:4000', changeOrigin: true },
      '/jewellery-images': { target: process.env.VITE_API_URL || 'http://localhost:4000', changeOrigin: true },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
});
