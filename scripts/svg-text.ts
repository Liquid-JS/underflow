import { readFile } from 'node:fs/promises'
import type { Plugin } from 'rollup'
import { optimize } from 'svgo'

/**
 * Loads SVG files as their markup, which the sources import as text:
 * `import bold from './icons/bold.svg' with { type: 'text' }`. Bundlers don't all support text imports yet
 * (Vite drops import attributes), so the build, the tests and the demo load them through this plugin, which
 * minifies them with svgo, and the built library has the markup inlined.
 */
export const svgText = (): Plugin & { enforce: 'pre' } => ({
    name: 'svg-text',
    enforce: 'pre',
    load: async (id) => {
        const [file] = id.split('?')

        if (!file.endsWith('.svg')) {
            return null
        }

        const { data } = optimize(await readFile(file, 'utf8'), {
            path: file,
            multipass: true,
            plugins: [
                'preset-default',
                // the icons are inline SVG in HTML, which needs no namespace
                'removeXMLNS',
                {
                    // Tabler Icons start with an invisible box path (no stroke, no fill)
                    name: 'removeInvisiblePaths',
                    fn: () => ({
                        element: {
                            enter: (node, parent) => {
                                if (node.name === 'path' && node.attributes.stroke === 'none' && !node.attributes.fill) {
                                    parent.children = parent.children.filter((child) => child !== node)
                                }
                            }
                        }
                    })
                }
            ]
        })

        return `export default ${JSON.stringify(data)}`
    }
})
