import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: '0.0.0.0', // Allow access from other devices (like your phone)
    proxy: {
      '/api': {
        target: 'https://datapulse-backend-5khr.onrender.com',
        
        //target: 'http://localhost:8000',

        changeOrigin: true,
        secure: false,
        ws: true, 
        
      },
    },
  },
});