import { Plugin } from 'prosemirror-state'
import { Mark } from 'prosemirror-model'
import { EditorView } from 'prosemirror-view'

import { Emitter } from '../../types/event'
import { i18n } from '../../i18n/i18n'
import { cls } from '../../utils/dom'

import { EditPanel } from './edit-panel'

interface LinkRange {
    from: number
    to: number
    mark: Mark
}

export function findLinkRange(view: EditorView, pos: number): LinkRange | null {
    const { doc, schema } = view.state
    const $pos = doc.resolve(pos)
    const { parent } = $pos
    const start = $pos.start()
    const isLink = (candidateMark: Mark) => candidateMark.type === schema.marks.link
    let index = $pos.index()
    let mark = parent.maybeChild(index)?.marks.find(isLink)

    // the position can be at the end of the link
    if (!mark && index > 0) {
        index -= 1
        mark = parent.child(index).marks.find(isLink)
    }

    if (!mark) {
        return null
    }

    let startIndex = index
    let endIndex = index + 1

    while (startIndex > 0 && mark.isInSet(parent.child(startIndex - 1).marks)) {
        startIndex -= 1
    }
    while (endIndex < parent.childCount && mark.isInSet(parent.child(endIndex).marks)) {
        endIndex += 1
    }

    let from = start

    for (let i = 0; i < startIndex; i += 1) {
        from += parent.child(i).nodeSize
    }

    let to = from

    for (let i = startIndex; i < endIndex; i += 1) {
        to += parent.child(i).nodeSize
    }

    return { from, to, mark }
}

export class LinkEditPanel extends EditPanel {
    private range: LinkRange | null = null

    protected get className() {
        return cls('popup-edit-link')
    }

    protected get ariaLabel() {
        return i18n.get('Edit link')
    }

    protected get removeLabel() {
        return i18n.get('Remove link')
    }

    protected isTarget(element: HTMLElement) {
        const link = element.closest?.('a[href]')

        // a link containing an image is edited with the image link button of the image
        return !!link && this.view.dom.contains(link) && !link.querySelector('img')
    }

    protected getTargetElement() {
        if (!this.range) {
            return null
        }

        const { node } = this.view.domAtPos(this.range.from + 1)
        const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement)

        return (el?.closest('a') as HTMLElement) || null
    }

    protected open(target: HTMLElement) {
        const link = target.closest('a[href]')!
        const range = findLinkRange(this.view, this.view.posAtDOM(link, 0))

        if (!range) {
            return false
        }

        const { doc } = this.view.state
        let textOnly = true

        doc.nodesBetween(range.from, range.to, (node) => {
            if (node.isInline && !node.isText) {
                textOnly = false
            }
        })

        this.range = range
        this.show([
            { name: 'linkUrl', label: i18n.get('URL'), value: range.mark.attrs.linkUrl },
            {
                name: 'linkText',
                label: i18n.get('Link text'),
                value: doc.textBetween(range.from, range.to),
                // the link text can not be replaced when the link contains other inline nodes
                disabled: !textOnly
            }
        ])

        return true
    }

    hide() {
        super.hide()
        this.range = null
    }

    protected save({ linkUrl, linkText }: Record<string, string>) {
        if (!this.range) {
            return false
        }

        const url = linkUrl.trim()

        if (!url) {
            this.markInvalid('linkUrl')
            return false
        }

        if (!this.inputs.linkText.disabled && !linkText) {
            this.markInvalid('linkText')
            return false
        }

        const { from, to, mark } = this.range
        const { state } = this.view
        const { tr, doc, schema } = state
        const newMark = schema.marks.link.create({ ...mark.attrs, linkUrl: url })

        if (!this.inputs.linkText.disabled && linkText !== doc.textBetween(from, to)) {
            const marks = newMark.addToSet(mark.removeFromSet(doc.nodeAt(from)!.marks))

            tr.replaceWith(from, to, schema.text(linkText, marks))
        } else {
            tr.removeMark(from, to, mark).addMark(from, to, newMark)
        }

        this.view.dispatch(tr)

        return true
    }

    protected remove() {
        if (this.range) {
            const { from, to, mark } = this.range

            this.view.dispatch(this.view.state.tr.removeMark(from, to, mark))
        }
    }
}

export function linkEditPanel(eventEmitter: Emitter) {
    return new Plugin({
        view: (view) => new LinkEditPanel(view, eventEmitter)
    })
}
