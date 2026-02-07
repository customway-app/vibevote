import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Dev-only proxy to avoid CORS when VITE_WP_BASE_URL is empty.
      '/wp-json': {
        target: 'http://vibevote.local',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
