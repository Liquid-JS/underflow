import hljs from 'highlight.js/lib/core'
import xml from 'highlight.js/lib/languages/xml'
import type { LineNumberOptions } from '../utils/highlight'
import { getHTMLRenderers } from './to-html-renderers'
import type { MdNode } from '@liquid-js/underflow'

hljs.registerLanguage('xml', xml)

function renderCodeBlock(literal: string, info = '', lineNumbers: LineNumberOptions | null = null) {
    const node = { literal, info, fenceLength: 3 } as unknown as MdNode

    return getHTMLRenderers(hljs, lineNumbers).codeBlock(node)
}

function getContent(literal: string, info = '') {
    return (renderCodeBlock(literal, info).find((token) => token.type === 'html') as { content: string })
        .content
}

describe('codeBlock renderer', () => {
    it('should escape the content when the language is not specified', () => {
        expect(getContent('<b>"a" & b</b>')).toBe('&lt;b&gt;&quot;a&quot; &amp; b&lt;/b&gt;')
    })

    it('should escape the content when the language is not registered', () => {
        expect(getContent('<b>a</b>', 'unknownlang')).toBe('&lt;b&gt;a&lt;/b&gt;')
    })

    it('should highlight the content when the language is registered', () => {
        expect(getContent('<b>a</b>', 'xml')).toBe(
            hljs.highlight('<b>a</b>', { language: 'xml', ignoreIllegals: true }).value
        )
    })

    it('should highlight languages given by an alias', () => {
        expect(getContent('<b>a</b>', 'html')).toContain('hljs-tag')
    })

    it('should add the highlight.js classes to the code element of a registered language', () => {
        const [, code] = renderCodeBlock('<b>a</b>', 'html')

        expect(code).toMatchObject({ tagName: 'code', classNames: ['hljs', 'language-html'] })
    })

    it('should not add the highlight.js classes for an unknown language', () => {
        const [pre, code] = renderCodeBlock('a', 'unknownlang')

        expect(pre).toMatchObject({ classNames: ['lang-unknownlang'] })
        expect(code).toMatchObject({ classNames: [], attributes: { 'data-language': 'unknownlang' } })
    })

    it('should mark numbered code and set the first line number', () => {
        const [, code] = renderCodeBlock('<a>\n<b>', 'html', { startFrom: 5, singleLine: false })

        expect(code).toMatchObject({
            classNames: ['hljs', 'language-html', 'hljs-ln'],
            attributes: { style: 'counter-reset: hljs-ln 4' }
        })
    })
})
