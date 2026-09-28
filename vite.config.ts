// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@services': path.resolve(__dirname, './src/services'),
      '@store': path.resolve(__dirname, './src/store'),
    },
  },
  build: {
    outDir: '../frontend_build',
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: true,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'react', test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 50 },
            { name: 'router', test: /[\\/]node_modules[\\/](react-router|react-router-dom|@remix-run[\\/]router)[\\/]/, priority: 40 },
            {
              name: 'redux',
              test: /[\\/]node_modules[\\/](@reduxjs[\\/]toolkit|react-redux|redux|redux-thunk|reselect|immer|use-sync-external-store)[\\/]/,
              priority: 30,
            },
            { name: 'icons', test: /[\\/]node_modules[\\/]lucide-react[\\/]/, priority: 20 },
            // Общие с recharts/react-markdown мелкие утилиты: без своей группы они попадают
            // в тяжёлый чанк, и стартовая страница тянет его целиком ради `cn()`.
            {
              name: 'ui-utils',
              test: /[\\/]node_modules[\\/](clsx|tailwind-merge|class-variance-authority)[\\/]/,
              priority: 20,
            },
            { name: 'charts', test: /[\\/]node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor)[\\/]/, priority: 10 },
            {
              name: 'syntax',
              test: /[\\/]node_modules[\\/](react-syntax-highlighter|prismjs|refractor|highlight\.js)[\\/]/,
              priority: 10,
            },
            { name: 'office', test: /[\\/]node_modules[\\/](xlsx|officeparser|mammoth|pdf-parse|pdfjs-dist)[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
  define: {
    __DEV__: mode === 'development',
  },
}))