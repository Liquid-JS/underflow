import { renderMarkdown } from './render'

// without a DOM, as on the server
describe('renderMarkdown() in Node', () => {
    it('should need a sanitizer, as DOMPurify needs a DOM', () => {
        expect(typeof document).toBe('undefined')
        expect(() => renderMarkdown('text')).toThrow(/sanitizer/)
    })

    it('should render with a sanitizer, or null for trusted markdown', () => {
        const html = renderMarkdown('# Title\n\n* [x] done\n\n| a |\n| - |\n| 1 |\n\n```js\nconst a = 1\n```', { sanitizer: null })

        expect(html).toContain('<h1>Title</h1>')
        expect(html).toContain('class="task-list-item checked"')
        expect(html).toContain('<td>1</td>')
        expect(html).toContain('<pre class="lang-js"><code data-language="js">const a = 1')
        expect(renderMarkdown('*a*', { sanitizer: (text) => text.toUpperCase() })).toBe('<P><EM>A</EM></P>\n')
    })
})

describe('renderMarkdown() with plugins in Node', () => {
    it('should highlight code with the code syntax highlight plugin', async () => {
        const { codeSyntaxHighlightPlugin } = await import('./plugins/code-syntax-highlight')
        const { default: hljs } = await import('highlight.js/lib/core')
        const { default: javascript } = await import('highlight.js/lib/languages/javascript')

        hljs.registerLanguage('javascript', javascript)

        const html = renderMarkdown('```javascript\nconst a = 1\n```', {
            sanitizer: null,
            plugins: [[codeSyntaxHighlightPlugin, { highlighter: hljs }]]
        })

        expect(html).toContain('<span class="hljs-keyword">const</span>')
    })
})
