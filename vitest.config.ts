import { defineConfig } from 'vitest/config'
import { minifyTemplateLiterals } from 'rollup-plugin-minify-template-literals'
import { minifyHtm } from './scripts/minify-htm.ts'
import { svgText } from './scripts/svg-text.ts'

export default defineConfig({
    // the templates are minified as in the build, so the tests run them as they're published
    plugins: [svgText(), minifyTemplateLiterals({ minify: { html: minifyHtm, css: false } })],
    test: {
        globals: true,
        restoreMocks: false,
        setupFiles: ['./test/setup.ts'],
        css: false,
        projects: [
            {
                extends: true,
                test: {
                    name: 'parser',
                    environment: 'node',
                    include: ['src/parser/**/*.spec.ts', 'src/render.spec.ts', 'scripts/**/*.spec.ts']
                }
            },
            {
                extends: true,
                test: {
                    name: 'editor',
                    environment: 'jsdom',
                    include: ['src/editor/**/*.spec.ts', 'src/plugins/**/*.spec.ts']
                }
            }
        ]
    }
})
