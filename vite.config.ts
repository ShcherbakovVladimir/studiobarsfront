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
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-dom') || id.includes('/react/')) return 'react'
          if (id.includes('react-router')) return 'router'
          if (id.includes('@reduxjs') || id.includes('react-redux')) return 'redux'
          if (id.includes('recharts')) return 'charts'
          if (id.includes('react-syntax-highlighter') || id.includes('prismjs') || id.includes('highlight.js')) {
            return 'syntax'
          }
          if (
            id.includes('katex') ||
            id.includes('rehype') ||
            id.includes('remark') ||
            id.includes('react-markdown') ||
            id.includes('/marked/')
          ) {
            return 'markdown'
          }
          if (id.includes('lucide-react')) return 'icons'
          if (
            id.includes('xlsx') ||
            id.includes('officeparser') ||
            id.includes('mammoth') ||
            id.includes('pdf-parse') ||
            id.includes('pdfjs')
          ) {
            return 'office'
          }
        },
      },
    },
  },
  define: {
    __DEV__: mode === 'development',
  },
}))