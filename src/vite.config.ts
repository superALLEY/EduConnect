import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    // Performance optimizations
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
    // Improve chunk splitting for better caching
    rollupOptions: {
      output: {
        // Use 'educonnect' as the base name for chunks
        chunkFileNames: 'assets/educonnect-[name]-[hash].js',
        entryFileNames: 'assets/educonnect-[name]-[hash].js',
        assetFileNames: 'assets/educonnect-[name]-[hash].[ext]',
        // Manually split chunks for better loading
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'ui': ['lucide-react', 'motion/react'],
        },
      },
    },
    // Target modern browsers for better performance
    target: 'es2015',
    // Enable CSS code splitting
    cssCodeSplit: true,
  },
  server: {
    port: 3000,
    open: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['@google-translate'],
  },
});