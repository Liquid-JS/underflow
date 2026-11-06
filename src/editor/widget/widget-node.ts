import { Node as ProsemirrorNode } from 'prosemirror-model'
import { NodeSchema } from '../spec/node'
import { WidgetRules, WIDGET_CLASS_NAME } from './rules'

/** The node view of a widget in the WYSIWYG editor, where widgets are interactive. */
export function createWidgetNodeView(widgetRules: WidgetRules) {
    return (pmNode: ProsemirrorNode) => {
        const dom = widgetRules.toDOM(pmNode.attrs.info, pmNode.attrs.text, true)

        dom.contentEditable = 'false'

        return { dom }
    }
}

export function isWidgetNode(pmNode: ProsemirrorNode) {
    return pmNode.type.name === 'widget'
}

/** An inline widget in the WYSIWYG editor: a leaf holding the markdown text it stands for. */
export class Widget extends NodeSchema {
    private widgetRules: WidgetRules

    constructor(widgetRules: WidgetRules) {
        super()
        this.widgetRules = widgetRules
    }

    get name() {
        return 'widget'
    }

    get schema() {
        const { widgetRules } = this

        return {
            attrs: {
                info: { default: null },
                text: { default: '' }
            },
            group: 'inline',
            inline: true,
            selectable: false,
            atom: true,
            leafText: (node: ProsemirrorNode) => node.attrs.text,
            // getHTML() and copying show the widget as it renders, not interactive
            toDOM: (node: ProsemirrorNode) => widgetRules.toDOM(node.attrs.info, node.attrs.text, false),
            parseDOM: [
                {
                    tag: `span.${WIDGET_CLASS_NAME}[data-widget]`,
                    getAttrs: (dom: Node | string) => {
                        const el = dom as HTMLElement

                        return {
                            info: el.getAttribute('data-widget'),
                            text: el.getAttribute('data-widget-text') ?? el.textContent
                        }
                    }
                }
            ]
        }
    }
}
