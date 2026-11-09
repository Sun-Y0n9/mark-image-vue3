import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/mark-image-vue3/',
  plugins: [vue()],
  build: {
    outDir: 'demo-dist',
    emptyOutDir: true
  }
})
