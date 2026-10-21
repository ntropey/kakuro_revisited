import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// base './' lets the app be hosted under any path (GitHub Pages, /play/, ...)
export default defineConfig({
  base: './',
  plugins: [react()],
  worker: { format: 'es' },
  build: { target: 'es2022' },
});
