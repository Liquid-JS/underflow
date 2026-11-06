import type { HLJSApi } from 'highlight.js'
import { getLanguage, highlightToHTML, LineNumberOptions } from '../utils/highlight'
import type { MdNode, CodeBlockMdNode } from '@liquid-js/underflow'
import type { HTMLToken } from '@liquid-js/underflow/parser'

const BACKTICK_COUNT = 3

export function getHTMLRenderers(hljs: HLJSApi, lineNumbers: LineNumberOptions | null = null) {
    return {
        codeBlock: (node: MdNode): HTMLToken[] => {
            const { fenceLength, info } = node as CodeBlockMdNode
            const [lang] = info ? info.split(/\s+/) : []
            const preClasses: string[] = []
            const codeClasses: string[] = []
            const codeAttrs: Record<string, any> = {}

            if (fenceLength > BACKTICK_COUNT) {
                codeAttrs['data-backticks'] = fenceLength
            }

            if (lang) {
                preClasses.push(`lang-${lang}`)
                codeAttrs['data-language'] = lang

                if (getLanguage(hljs, lang)) {
                    codeClasses.push('hljs', `language-${lang}`)
                }
            }

            const content = highlightToHTML(hljs, node.literal!, lang, lineNumbers)

            if (lineNumbers && content.startsWith('<span class="hljs-ln-line">')) {
                codeClasses.push('hljs-ln')

                if (lineNumbers.startFrom !== 1) {
                    codeAttrs.style = `counter-reset: hljs-ln ${lineNumbers.startFrom - 1}`
                }
            }

            return [
                { type: 'openTag', tagName: 'pre', classNames: preClasses },
                { type: 'openTag', tagName: 'code', classNames: codeClasses, attributes: codeAttrs },
                // highlight.js escapes the code it highlights; other code is escaped by highlightToHTML
                { type: 'html', content },
                { type: 'closeTag', tagName: 'code' },
                { type: 'closeTag', tagName: 'pre' }
            ]
        }
    }
}
