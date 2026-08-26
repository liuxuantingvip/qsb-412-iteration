import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      main: path.resolve(__dirname, 'src/shims/main'),
    },
  },
  server: {
    port: 5178,
    strictPort: true,
  },
});
