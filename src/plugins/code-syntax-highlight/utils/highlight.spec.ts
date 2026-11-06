import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import { getLineStarts, highlightToHTML, highlightToRanges } from './highlight'

hljs.registerLanguage('javascript', javascript)

describe('highlightToRanges', () => {
    const code = 'const a = "<b>&amp;</b>"; // comment\nfunction f(x) { return x * 2; }'

    it('should cover the whole code with its ranges', () => {
        const ranges = highlightToRanges(hljs, code, 'javascript')

        expect(ranges.map(({ text }) => text).join('')).toBe(code)
    })

    it('should give each range the classes of all enclosing spans', () => {
        const ranges = highlightToRanges(hljs, code, 'js')

        expect(ranges).toContainEqual({ text: 'const', classes: ['hljs-keyword'] })
        expect(ranges).toContainEqual({ text: '"<b>&amp;</b>"', classes: ['hljs-string'] })
        expect(ranges).toContainEqual({ text: 'x', classes: ['hljs-params'] })
    })

    it('should return no ranges for an unknown language', () => {
        expect(highlightToRanges(hljs, code, 'unknownlang')).toEqual([])
        expect(highlightToRanges(hljs, code, null)).toEqual([])
    })
})

describe('highlightToHTML with line numbers', () => {
    const lineNumbers = { startFrom: 1, singleLine: false }

    function getLines(html: string) {
        const template = document.createElement('template')

        template.innerHTML = html

        return Array.from(template.content.children).filter((el) => el.matches('.hljs-ln-line'))
    }

    it('should wrap every line in its own element', () => {
        const html = highlightToHTML(hljs, 'const a = 1;\nconst b = 2;\n', 'javascript', lineNumbers)
        const lines = getLines(html)

        expect(lines.map((line) => line.textContent)).toEqual(['const a = 1;', 'const b = 2;'])
    })

    it('should close and reopen tokens that span several lines', () => {
        const code = '/* first\nsecond */ const a = `x\ny`;'
        const lines = getLines(highlightToHTML(hljs, code, 'javascript', lineNumbers))

        expect(lines).toHaveLength(3)
        expect(lines[0].querySelector('.hljs-comment')?.textContent).toBe('/* first')
        expect(lines[1].querySelector('.hljs-comment')?.textContent).toBe('second */')
        expect(lines[1].querySelector('.hljs-string')?.textContent).toBe('`x')
        expect(lines[2].querySelector('.hljs-string')?.textContent).toBe('y`')
        expect(lines.map((line) => line.textContent).join('\n')).toBe(code)
    })

    it('should keep the text of the code', () => {
        const code = 'if (a < b && c > "d") {\n  return \'<b>\';\n}'
        const lines = getLines(highlightToHTML(hljs, code, 'javascript', lineNumbers))

        expect(lines.map((line) => line.textContent).join('\n')).toBe(code)
    })

    it('should number plain code without a known language', () => {
        const lines = getLines(highlightToHTML(hljs, '<a>\n<b>', null, lineNumbers))

        expect(lines.map((line) => line.innerHTML)).toEqual(['&lt;a&gt;', '&lt;b&gt;'])
    })

    it('should leave single lines unnumbered unless singleLine is set', () => {
        expect(getLines(highlightToHTML(hljs, 'const a = 1;', 'javascript', lineNumbers))).toHaveLength(0)
        expect(
            getLines(
                highlightToHTML(hljs, 'const a = 1;', 'javascript', { ...lineNumbers, singleLine: true })
            )
        ).toHaveLength(1)
    })
})

describe('getLineStarts', () => {
    it('should return the offset of every line start, ignoring a trailing line break', () => {
        expect(getLineStarts('ab\ncd\r\nef\n', { startFrom: 1, singleLine: false })).toEqual([0, 3, 7])
    })

    it('should return no positions for a single line unless singleLine is set', () => {
        expect(getLineStarts('ab', { startFrom: 1, singleLine: false })).toEqual([])
        expect(getLineStarts('ab', { startFrom: 1, singleLine: true })).toEqual([0])
    })
})
