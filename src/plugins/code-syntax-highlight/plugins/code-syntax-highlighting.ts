import type { HLJSApi } from 'highlight.js'
import type { Node as ProsemirrorNode } from 'prosemirror-model'
import type { Decoration } from 'prosemirror-view'
import { getLineStarts, highlightToRanges, LineNumberOptions } from '../utils/highlight'
import type { PluginContext } from '@liquid-js/underflow'

const NODE_TYPE = 'codeBlock'

function createLineNumber(line: number) {
    const el = document.createElement('span')

    el.className = 'hljs-ln-n'
    el.setAttribute('data-line', String(line))
    el.setAttribute('aria-hidden', 'true')
    el.contentEditable = 'false'

    return el
}

function getDecorations(
    doc: ProsemirrorNode,
    context: PluginContext,
    hljs: HLJSApi,
    lineNumbers: LineNumberOptions | null
) {
    const { pmView } = context
    const decorations: Decoration[] = []

    doc.descendants((node, pos) => {
        if (node.isBlock && node.type.name === NODE_TYPE) {
            let from = pos + 1

            const code = node.textContent
            const ranges = highlightToRanges(hljs, code, node.attrs.language)

            if (lineNumbers) {
                getLineStarts(code, lineNumbers).forEach((offset, index) => {
                    const line = lineNumbers.startFrom + index

                    decorations.push(
                        pmView.Decoration.widget(pos + 1 + offset, () => createLineNumber(line), {
                            side: -1,
                            key: `hljs-ln-${line}`,
                            ignoreSelection: true
                        })
                    )
                })
            }

            ranges.forEach(({ text, classes }) => {
                const to = from + text.length

                if (classes.length) {
                    decorations.push(pmView.Decoration.inline(from, to, { class: classes.join(' ') }))
                }
                from = to
            })

            return false
        }

        return true
    })

    return pmView.DecorationSet.create(doc, decorations)
}

export function codeSyntaxHighlighting(
    context: PluginContext,
    hljs: HLJSApi,
    lineNumbers: LineNumberOptions | null = null
) {
    return new context.pmState.Plugin({
        state: {
            init: (_, { doc }) => getDecorations(doc, context, hljs, lineNumbers),
            apply: (tr, set) => {
                if (!tr.docChanged) {
                    return set.map(tr.mapping, tr.doc)
                }

                return getDecorations(tr.doc, context, hljs, lineNumbers)
            }
        },
        props: {
            decorations(state) {
                return this.getState(state)
            }
        }
    })
}
