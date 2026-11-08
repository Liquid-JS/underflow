import { Plugin } from 'prosemirror-state'

import { Emitter } from '../../types/event'
import { I18n } from '../../i18n/i18n'
import { cls } from '../../utils/dom'

import { EditPanel } from './edit-panel'

export class ImageEditPanel extends EditPanel {
    private pos: number | null = null

    protected get className() {
        return cls('popup-edit-image')
    }

    protected get ariaLabel() {
        return this.i18n.get('Edit image')
    }

    protected get removeLabel() {
        return this.i18n.get('Remove image')
    }

    protected isTarget(element: HTMLElement) {
        return element.nodeName === 'IMG' && this.view.dom.contains(element)
    }

    protected getTargetElement() {
        if (this.pos === null) {
            return null
        }

        const dom = this.view.nodeDOM(this.pos) as HTMLElement | null

        return dom && dom.nodeName !== 'IMG' ? dom.querySelector('img') : dom
    }

    private findImagePos(img: HTMLElement) {
        const { doc, schema } = this.view.state
        const pos = this.view.posAtDOM(img, 0)

        // depending on the image node view, the position can be before or after the image
        return [pos, pos - 1].find((candidate) => {
            const node = candidate >= 0 ? doc.nodeAt(candidate) : null

            return node?.type === schema.nodes.image
        })
    }

    protected open(target: HTMLElement) {
        const pos = this.findImagePos(target)

        if (typeof pos === 'undefined') {
            return false
        }

        const { imageUrl, altText } = this.view.state.doc.nodeAt(pos)!.attrs

        this.pos = pos
        this.show([
            { name: 'imageUrl', label: this.i18n.get('Image URL'), value: imageUrl || '' },
            { name: 'altText', label: this.i18n.get('Description'), value: altText || '' }
        ])

        return true
    }

    hide() {
        super.hide()
        this.pos = null
    }

    protected save({ imageUrl, altText }: Record<string, string>) {
        if (this.pos === null) {
            return false
        }

        const url = imageUrl.trim()

        if (!url) {
            this.markInvalid('imageUrl')
            return false
        }

        const { tr, doc } = this.view.state
        const { attrs, marks } = doc.nodeAt(this.pos)!

        tr.setNodeMarkup(this.pos, null, { ...attrs, imageUrl: url, altText: altText || null }, marks)
        this.view.dispatch(tr)

        return true
    }

    protected remove() {
        if (this.pos !== null) {
            const { tr, doc } = this.view.state

            this.view.dispatch(tr.delete(this.pos, this.pos + doc.nodeAt(this.pos)!.nodeSize))
        }
    }
}

export function imageEditPanel(eventEmitter: Emitter, i18n?: I18n) {
    return new Plugin({
        view: (view) => new ImageEditPanel(view, eventEmitter, i18n)
    })
}
