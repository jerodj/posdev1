import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: mode === 'pos' ? 5174 : 5173,
  },
  build: {
    outDir: mode === 'pos' ? 'dist-pos' : 'dist',
  },
}));