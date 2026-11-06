import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import compiler from '@liquid-js/rollup-plugin-closure-compiler'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import type { Plugin, RollupOptions } from 'rollup'
import * as sass from 'sass'
import { minifyTemplateLiterals } from 'rollup-plugin-minify-template-literals'
import { minifyHtm } from './scripts/minify-htm.ts'
import { svgText } from './scripts/svg-text.ts'

const root = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))

const peers = [...Object.keys(pkg.peerDependencies ?? {}), ...Object.keys(pkg.dependencies ?? {})]
const external = (id: string) => peers.some((p) => id === p || id.startsWith(`${p}/`))

const locales = (await readdir(join(root, 'src/editor/i18n'))).filter(
    (f) => f.endsWith('.ts') && f !== 'i18n.ts' && !f.endsWith('.spec.ts')
)

/** Stylesheet entry points, compiled to lib/styles/<name>. */
const cssBundles: Record<string, string> = {
    'editor.css': 'src/editor/styles/editor.scss',
    'editor-only.css': 'src/editor/styles/editor-only.scss',
    'viewer.css': 'src/editor/styles/viewer.scss',
    'theme/dark.css': 'src/editor/styles/theme/dark.scss',
    'plugins/code-syntax-highlight.css': 'src/plugins/code-syntax-highlight/styles/plugin.scss'
}

/** Compiles each stylesheet bundle with Sass and emits it under lib/styles. */
const styles = (): Plugin => ({
    name: 'styles',
    async generateBundle() {
        for (const [name, entry] of Object.entries(cssBundles)) {
            const compiled = sass.compile(resolve(root, entry), {
                loadPaths: [resolve(root, 'node_modules')],
                style: 'compressed'
            })

            compiled.loadedUrls
                .filter((url) => url.protocol === 'file:')
                .forEach((url) => this.addWatchFile(fileURLToPath(url)))
            // compressed CSS with non-ASCII text starts with a byte order mark, which must stay first
            const css = compiled.css.replace(/^\uFEFF/, '')
            const bom = css === compiled.css ? '' : '\uFEFF'

            this.emitFile({ type: 'asset', fileName: `styles/${name}`, source: `${bom}${css}` })
        }
    }
})

/**
 * Publishes the SCSS sources under lib/scss so applications can compile the stylesheets in their
 * own build: the editor's stylesheets at the root (editor.scss, ui/, theme/dark.scss), the plugin's as
 * plugins/code-syntax-highlight.scss.
 */
const scss = (): Plugin => ({
    name: 'scss',
    async generateBundle() {
        const stylesDir = resolve(root, 'src/editor/styles')
        const files = (await readdir(stylesDir, { recursive: true })).filter((f) => f.endsWith('.scss'))

        for (const file of files) {
            this.emitFile({
                type: 'asset',
                fileName: `scss/${file.split('\\').join('/')}`,
                source: await readFile(join(stylesDir, file), 'utf8')
            })
        }

        this.emitFile({
            type: 'asset',
            fileName: 'scss/plugins/code-syntax-highlight.scss',
            source: await readFile(resolve(root, 'src/plugins/code-syntax-highlight/styles/plugin.scss'), 'utf8')
        })
    }
})

/**
 * Publishes the license notices of code under other licenses (the LICENSE files in src) next to its declarations in
 * lib, e.g. lib/parser/commonmark/LICENSE.
 */
const licenses = (): Plugin => ({
    name: 'licenses',
    async generateBundle() {
        const src = resolve(root, 'src')
        const files = (await readdir(src, { recursive: true })).filter((f) => f.split(/[\\/]/).pop() === 'LICENSE')

        for (const file of files) {
            this.emitFile({
                type: 'asset',
                fileName: file.split('\\').join('/'),
                source: await readFile(join(src, file), 'utf8')
            })
        }
    }
})

const common = () => [
    svgText(),
    typescript({
        declaration: true,
        declarationDir: './lib/',
        inlineSources: true,
        tsconfig: 'tsconfig.lib.json'
    }),
    commonjs(),
    json(),
    minifyTemplateLiterals({ minify: { html: minifyHtm, css: false } })
]

const bundle = () => [
    nodeResolve({ browser: true }),
    compiler({
        language_in: 'ECMASCRIPT_NEXT',
        language_out: 'ECMASCRIPT_NEXT'
    }),
    terser()
]

export default {
    input: {
        'index': 'src/index.ts',
        'viewer': 'src/viewer.ts',
        'parser': 'src/parser.ts',
        'plugins/code-syntax-highlight': 'src/plugins/code-syntax-highlight.ts',
        ...Object.fromEntries(locales.map((f) => [`i18n/${f.replace(/\.ts$/, '')}`, `src/editor/i18n/${f}`]))
    },
    output: {
        dir: 'lib',
        format: 'esm',
        sourcemap: true,
        chunkFileNames: 'chunks/[name]-[hash].js'
    },
    external,
    plugins: [...common(), ...bundle(), styles(), scss(), licenses()]
} satisfies RollupOptions
