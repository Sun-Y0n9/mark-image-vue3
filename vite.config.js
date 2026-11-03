import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    cssInjectedByJsPlugin()
  ],
  server: {
    port: 5173,
    host: '127.0.0.1'
  },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.js', import.meta.url)),
      name: 'MarkImage',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => {
        if (format === 'es') return 'mark-image.js'
        if (format === 'cjs') return 'mark-image.cjs'
        return 'mark-image.umd.js'
      }
    },
    rollupOptions: {
      external: ['vue', 'fabric'],
      output: {
        globals: {
          vue: 'Vue',
          fabric: 'fabric'
        },
        exports: 'named'
      }
    }
  }
})
