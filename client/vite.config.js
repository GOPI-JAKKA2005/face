import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@vladmandic/face-api')) {
            return 'face-api';
          }
          if (id.includes('@ffmpeg')) {
            return 'ffmpeg';
          }
          if (id.includes('swiper')) {
            return 'swiper';
          }
          if (id.includes('framer-motion')) {
            return 'framer-motion';
          }
          if (id.includes('firebase')) {
            return 'firebase';
          }
          if (id.includes('recharts')) {
            return 'charts';
          }
        }
      }
    }
  },
  server: {
    port: 5173,
    fs: {
      allow: ['..']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
