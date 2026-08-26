import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  base: '/print/',
  plugins: [
    vue(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/pagedjs/dist/paged.polyfill.min.js',
          dest: 'vendor',
          rename: { stripBase: 3, name: 'paged.polyfill.js' },
        },
      ],
    }),
  ],
  build: {
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1700,
    rolldownOptions: {
      output: {
        manualChunks(id: string | string[]) {
          if (id.includes('node_modules/vue') || id.includes('node_modules/@vue') || id.includes('node_modules/primevue') || id.includes('node_modules/@primeuix')) return 'vendor-vue'
          if (id.includes('node_modules/@codemirror') || id.includes('node_modules/codemirror') || id.includes('node_modules/vue-codemirror')) return 'vendor-codemirror'
          if (id.includes('node_modules/marked') || id.includes('node_modules/highlight.js') || id.includes('node_modules/katex')) return 'vendor-markdown'
        },
      },
    },
  }
})
