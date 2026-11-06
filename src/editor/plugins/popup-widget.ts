import { EditorView } from 'prosemirror-view'
import { Plugin, PluginKey } from 'prosemirror-state'
import { WidgetStyle } from '../types/editor'
import { Emitter } from '../types/event'
import { closest, cls } from '../utils/dom'
import { css } from '../utils/native'
interface Widget {
    node: HTMLElement
    style: WidgetStyle
    pos: number
}

const pluginKey = new PluginKey('widget')
const MARGIN = 5

class PopupWidget {
    private popup: HTMLElement | null = null

    private eventEmitter: Emitter

    private rootEl!: HTMLElement

    constructor(view: EditorView, eventEmitter: Emitter) {
        this.rootEl = view.dom.parentElement!
        this.eventEmitter = eventEmitter
        this.eventEmitter.listen('blur', this.removeWidget)
        this.eventEmitter.listen('loadUI', () => {
            this.rootEl = closest(view.dom.parentElement!, `.${cls('default-ui')}`) as HTMLElement
        })
        this.eventEmitter.listen('removePopupWidget', this.removeWidget)
    }

    private removeWidget = () => {
        if (this.popup) {
            this.rootEl.removeChild(this.popup)
            this.popup = null
        }
    }

    update(view: EditorView) {
        const widget: Widget | null = pluginKey.getState(view.state)

        this.removeWidget()

        if (widget) {
            const { node, style } = widget
            const { top, left, bottom } = view.coordsAtPos(widget.pos)
            const height = bottom - top
            const rect = this.rootEl.getBoundingClientRect()
            const relTopPos = top - rect.top

            css(node, { opacity: '0', position: 'absolute' })
            this.rootEl.appendChild(node)
            css(node, {
                left: `${left - rect.left + MARGIN}px`,
                // below the cursor's line, or above it, by the popup's own height
                top: `${style === 'bottom' ? relTopPos + height - MARGIN : relTopPos - node.offsetHeight + MARGIN}px`,
                opacity: '1'
            })
            this.popup = node
            view.focus()
        }
    }

    destroy() {
        this.eventEmitter.removeEventHandler('blur', this.removeWidget)
    }
}

export function addWidget(eventEmitter: Emitter) {
    return new Plugin({
        key: pluginKey,
        state: {
            init: () => null,
            apply: (tr) => tr.getMeta('widget')
        },
        view: (editorView) => new PopupWidget(editorView, eventEmitter)
    })
}
