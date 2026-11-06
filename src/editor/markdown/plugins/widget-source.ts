import { EditorState, Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Node as ProsemirrorNode } from 'prosemirror-model'
import { Emitter } from '../../types/event'
import { WidgetRules, getWidgetText, isWidgetMdNode } from '../../widget/rules'
import { getStartPosListPerLine } from '../helper/pos'
import { cls } from '../../utils/dom'
import { MarkdownDocument } from '../../../parser/markdown-document'
import { Pos as MdPos } from '../../../parser/types/node'

const WIDGET_CLASS_NAME = cls('md-widget')
const COLLAPSED_CLASS_NAME = cls('md-widget-collapsed')

export interface WidgetRange {
    from: number
    to: number
    info: string
    text: string
    start: MdPos
    end: MdPos
}

const widgetSourceKey = new PluginKey<WidgetRange[]>('widgetSource')

/** The widgets in the parsed markdown, with their positions in the markdown editor. */
function findWidgets(markdownDocument: MarkdownDocument, doc: ProsemirrorNode) {
    const ranges: WidgetRange[] = []
    const lineStarts = getStartPosListPerLine(doc, doc.childCount)
    const walker = markdownDocument.getRootNode().walker()
    let event

    while ((event = walker.next())) {
        const { node, entering } = event

        if (entering && isWidgetMdNode(node)) {
            const [[startLine, startCh], [endLine, endCh]] = node.sourcepos!

            // a line is a paragraph in the markdown editor: its text starts one position after it
            ranges.push({
                from: lineStarts[startLine - 1] + startCh,
                to: lineStarts[endLine - 1] + endCh + 1,
                info: node.info,
                text: getWidgetText(node),
                start: [startLine, startCh],
                end: [endLine, endCh + 1]
            })
        }
    }

    return ranges
}

function findWidgetAt(state: EditorState, pos: number) {
    return widgetSourceKey.getState(state)!.find(({ from, to }) => pos >= from && pos <= to)
}

function createDecorations(state: EditorState, widgetRules: WidgetRules) {
    const { from: selectionFrom, to: selectionTo } = state.selection
    const decorations: Decoration[] = []

    widgetSourceKey.getState(state)!.forEach(({ from, to, info, text }) => {
        const cursorInside = selectionFrom <= to && selectionTo >= from

        decorations.push(Decoration.inline(from, to, { 'class': WIDGET_CLASS_NAME, 'data-widget': info }))

        widgetRules.getRule(info)?.toSource?.(text).forEach((part) => {
            const classNames = part.className ? [part.className] : []

            if (part.collapsed && !cursorInside) {
                classNames.push(COLLAPSED_CLASS_NAME)
            }
            if (classNames.length && part.to > part.from) {
                decorations.push(
                    Decoration.inline(from + part.from, from + Math.min(part.to, text.length), {
                        class: classNames.join(' ')
                    })
                )
            }
        })
    })

    return DecorationSet.create(state.doc, decorations)
}

/**
 * Widgets in the markdown editor: their text stays editable markdown, styled by the rule's
 * toSource(), and a click on one emits `clickWidget`. Widgets only help here: the text is never
 * changed or hidden while the cursor is in it.
 */
export function widgetSource(
    markdownDocument: MarkdownDocument,
    widgetRules: WidgetRules,
    eventEmitter: Emitter
) {
    return new Plugin<WidgetRange[]>({
        key: widgetSourceKey,
        state: {
            init: (_, state) => findWidgets(markdownDocument, state.doc),
            // the markdown document is updated before the transaction is applied
            apply: (tr, ranges, _, state) =>
                tr.docChanged ? findWidgets(markdownDocument, state.doc) : ranges
        },
        props: {
            decorations: (state) => createDecorations(state, widgetRules),
            handleClick: (view, pos, event) => {
                const widget = findWidgetAt(view.state, pos)

                if (widget) {
                    const { text, start, end } = widget

                    eventEmitter.emit('clickWidget', { text, start, end, event })
                }

                return false
            }
        }
    })
}
