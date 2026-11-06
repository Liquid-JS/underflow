import { defineConfig } from 'vite'

export default defineConfig({
    // the application is one bundle with the editor, ProseMirror and highlight.js
    build: { chunkSizeWarningLimit: 800 }
})
