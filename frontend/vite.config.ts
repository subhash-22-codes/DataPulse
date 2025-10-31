import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: '0.0.0.0', // allow access from other devices in same WiFi
    proxy: {
      '/api': {
        target: 'http://localhost:8000', // your backend
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
