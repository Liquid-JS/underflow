import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { svgText } from '../scripts/svg-text.ts'

const r = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
    plugins: [svgText()],
    // the page is one bundle with the editor, ProseMirror and highlight.js
    build: { chunkSizeWarningLimit: 800 },
    resolve: {
        alias: [
            { find: /^@liquid-js\/underflow\/parser$/, replacement: r('../src/parser.ts') },
            {
                find: /^@liquid-js\/underflow\/plugins\/code-syntax-highlight$/,
                replacement: r('../src/plugins/code-syntax-highlight.ts')
            },
            { find: /^@liquid-js\/underflow\/viewer$/, replacement: r('../src/viewer.ts') },
            { find: /^@liquid-js\/underflow$/, replacement: r('../src/index.ts') }
        ]
    }
})
