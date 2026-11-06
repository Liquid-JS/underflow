import { EditorView, NodeView } from 'prosemirror-view'
import { Node as ProsemirrorNode, Mark } from 'prosemirror-model'

import { Emitter } from '../../types/event'
import { closest, cls, setAttributes } from '../../utils/dom'
import { createTextSelection } from '../../helper/manipulation'
import { getCustomAttrs } from '../helper/node'

import { isFunction } from '../../utils/native'
import { i18n } from '../../i18n/i18n'
import { icons } from '../../ui/icons'

type GetPos = (() => number) | boolean

const IMAGE_LINK_CLASS_NAME = 'image-link'

export class ImageView implements NodeView {
    dom: HTMLElement

    private node: ProsemirrorNode

    private view: EditorView

    private getPos: GetPos

    private eventEmitter: Emitter

    private imageLink: Mark | null

    constructor(node: ProsemirrorNode, view: EditorView, getPos: GetPos, eventEmitter: Emitter) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.eventEmitter = eventEmitter
        this.imageLink = node.marks.filter(({ type }) => type.name === 'link')[0] ?? null
        this.dom = this.createElement()

        this.bindEvent()
    }

    private createElement() {
        const image = this.createImageElement(this.node)

        if (this.imageLink) {
            const wrapper = document.createElement('span')
            const button = document.createElement('button')

            wrapper.className = IMAGE_LINK_CLASS_NAME
            button.type = 'button'
            button.className = cls('image-link-button')
            button.setAttribute('contenteditable', 'false')
            button.setAttribute('aria-label', i18n.get('Edit link'))
            button.innerHTML = `<span class="${cls('icon')}" aria-hidden="true">${icons.link}</span>`
            wrapper.append(image, button)

            return wrapper
        }

        return image
    }

    private createImageElement(node: ProsemirrorNode) {
        const image = document.createElement('img')
        const { imageUrl, altText } = node.attrs
        const attrs = getCustomAttrs(node.attrs)

        image.src = imageUrl

        if (altText) {
            image.alt = altText
        }
        setAttributes(attrs, image)

        return image
    }

    private bindEvent() {
        if (this.imageLink) {
            this.dom.addEventListener('mousedown', this.handleMousedown)
        }
    }

    private handleMousedown = (ev: MouseEvent) => {
        ev.preventDefault()

        if (this.imageLink && isFunction(this.getPos) && closest(ev.target as HTMLElement, `.${cls('image-link-button')}`)) {
            const { tr } = this.view.state
            const pos = this.getPos()

            ev.stopPropagation()
            tr.setSelection(createTextSelection(tr, pos, pos + 1))
            this.view.dispatch(tr)
            this.eventEmitter.emit('openPopup', 'link', this.imageLink.attrs)
        }
    }

    stopEvent() {
        return true
    }

    destroy() {
        if (this.imageLink) {
            this.dom.removeEventListener('mousedown', this.handleMousedown)
        }
    }
}
