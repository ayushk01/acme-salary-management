import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    // In development the API runs as a separate process; in production the
    // same Express server serves both, so the paths match either way.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
