import { defineConfig } from 'vite'
import { svgText } from '../scripts/svg-text.ts'

export default defineConfig({
    // relative URLs, so the built demo works under any path (published at /underflow/demo/)
    base: './',
    plugins: [svgText()],
    build: {
        outDir: '../pages/demo',
        emptyOutDir: true,
        // the demo bundles the editor, ProseMirror and highlight.js
        chunkSizeWarningLimit: 1000
    }
})
