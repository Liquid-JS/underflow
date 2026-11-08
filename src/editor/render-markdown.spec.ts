import { renderMarkdown } from './render-markdown'
import { Viewer } from './viewer'
import { PluginContext } from './types/editor'

const markdown = [
    '# Title',
    'Some **bold** text, a [link](https://example.com) and `code`.',
    '* [ ] a task\n* [x] done',
    '1. one\n2. two',
    '> quote',
    '| a | b |\n| :- | -: |\n| 1 | 2 |',
    '```js\nconst a = 1\n```',
    '<div class="raw">html</div>',
    '<script>alert(1)</script>'
].join('\n\n')

/** A plugin that renders bold text with a class. */
const plugin = () => ({
    toHTMLRenderers: {
        strong: (_: unknown, { entering }: { entering: boolean }) => entering
            ? { type: 'openTag', tagName: 'strong', classNames: ['plugin'] }
            : { type: 'closeTag', tagName: 'strong' }
    }
}) as unknown as ReturnType<(context: PluginContext) => object>

describe('renderMarkdown()', () => {
    it('should render as the viewer shows it, with its options and plugins', () => {
        const el = document.createElement('div')
        const options = { linkAttributes: { target: '_blank' }, plugins: [plugin] }
        const viewer = new Viewer({ el, initialValue: markdown, ...options })
        const shown = el.querySelector('.uf-contents')!.innerHTML.replace(/\sdata-nodeid="\d+"/g, '')

        expect(renderMarkdown(markdown, options)).toBe(shown)
        expect(shown).toContain('<strong class="plugin">')
        expect(shown).toContain('target="_blank"')
        expect(shown).not.toContain('<script')
        viewer.destroy()
    })

    it('should sanitize the HTML with the given sanitizer, or keep it with null', () => {
        expect(renderMarkdown('<b>x</b>', { sanitizer: (html) => html.replace(/b>/g, 'i>') })).toBe('<p><i>x</i></p>\n')
        expect(renderMarkdown('<script>x</script>', { sanitizer: null })).toBe('<div><script>x</script></div>\n')
    })
})
