import { Schema, Node as ProsemirrorNode } from 'prosemirror-model'
import { WidgetRule } from '../types/editor'
import { CustomInlineMdNode, MdNode } from '@liquid-js/underflow/parser'

export const WIDGET_CLASS_NAME = 'uf-widget'

const reWidgetInfo = /^widget(\d+)$/

/** Whether a parsed node is a widget: the parser marks text matching a widget rule as `widget<index>`. */
export function isWidgetMdNode(node: MdNode): node is CustomInlineMdNode {
    return node.type === 'customInline' && reWidgetInfo.test((node as CustomInlineMdNode).info)
}

/** The markdown text a parsed widget node stands for. */
export function getWidgetText(node: CustomInlineMdNode) {
    return node.firstChild?.literal ?? ''
}

/** The widget rules of one editor or viewer. */
export class WidgetRules {
    readonly rules: WidgetRule[]

    /** the patterns for the parser's `widgetRules` option */
    readonly patterns: RegExp[]

    constructor(rules: WidgetRule[] = []) {
        this.rules = rules
        this.patterns = rules.map(({ rule }) => rule)
    }

    getRule(info: string): WidgetRule | undefined {
        const [, index] = info.match(reWidgetInfo) ?? []

        return index === undefined ? undefined : this.rules[Number(index)]
    }

    /** The widget's DOM, in a `uf-widget` element that keeps its info and text for copy and paste. */
    toDOM(info: string, text: string, interactive: boolean) {
        const dom = document.createElement('span')
        const rule = this.getRule(info)

        dom.className = WIDGET_CLASS_NAME
        dom.setAttribute('data-widget', info)
        dom.setAttribute('data-widget-text', text)

        if (rule) {
            dom.appendChild(rule.toDOM(text, { interactive }))
        } else {
            dom.textContent = text
        }

        return dom
    }

    /** Splits text into text nodes and widget nodes, for text inserted into the WYSIWYG editor. */
    createNodes(text: string, schema: Schema) {
        const nodes: ProsemirrorNode[] = []
        let rest = text

        while (rest) {
            let found: { index: number, text: string, info: string } | null = null

            for (let ruleIndex = 0; ruleIndex < this.patterns.length; ruleIndex += 1) {
                const { source, flags } = this.patterns[ruleIndex]
                const match = new RegExp(source, flags.replace(/[gy]/g, '')).exec(rest)

                if (match && match[0] && (!found || match.index < found.index)) {
                    found = { index: match.index, text: match[0], info: `widget${ruleIndex}` }
                }
            }

            if (!found) {
                nodes.push(schema.text(rest))
                break
            }

            const { index, text: widgetText, info } = found

            if (index) {
                nodes.push(schema.text(rest.slice(0, index)))
            }
            nodes.push(schema.nodes.widget.create({ info, text: widgetText }))
            rest = rest.slice(index + widgetText.length)
        }

        return nodes
    }
}
