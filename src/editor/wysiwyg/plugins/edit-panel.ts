import { EditorView } from 'prosemirror-view'
import { EditorState, PluginView } from 'prosemirror-state'

import { Emitter } from '../../types/event'
import { i18n } from '../../i18n/i18n'
import { cls, removeNode } from '../../utils/dom'

import { css } from '../../utils/native'

export interface EditPanelField {
    name: string
    label: string
    value: string
    disabled?: boolean
}

const GAP = 5

let fieldId = 0

/**
 * Base of the popups opened by clicking an element (link, image) in the wysiwyg editor.
 * It uses the look of the toolbar popups and writes only standard markdown attributes.
 */
export abstract class EditPanel implements PluginView {
    protected view: EditorView

    protected eventEmitter: Emitter

    protected el: HTMLElement | null = null

    protected inputs: Record<string, HTMLInputElement> = {}

    constructor(view: EditorView, eventEmitter: Emitter) {
        this.view = view
        this.eventEmitter = eventEmitter

        view.dom.addEventListener('click', this.handleClick)
        view.dom.addEventListener('scroll', this.handleScroll)
        document.addEventListener('mousedown', this.handleDocumentMousedown)
        eventEmitter.listen('changeMode', this.handleChangeMode)
    }

    protected abstract get className(): string

    protected abstract get ariaLabel(): string

    protected abstract get removeLabel(): string

    /** Opens the panel if the target is editable, and returns whether it did. */
    protected abstract open(target: HTMLElement): boolean

    protected abstract isTarget(element: HTMLElement): boolean

    protected abstract getTargetElement(): HTMLElement | null

    protected abstract save(values: Record<string, string>): boolean

    protected abstract remove(): void

    isOpened() {
        return !!this.el
    }

    update(view: EditorView, prevState: EditorState) {
        if (!this.el) {
            return
        }

        if (!view.editable) {
            this.hide()
            return
        }

        // the target can not be tracked reliably once the document is changed outside of the panel
        if (!view.state.doc.eq(prevState.doc)) {
            this.hide()
        } else {
            this.updatePosition()
        }
    }

    destroy() {
        this.hide()
        this.view.dom.removeEventListener('click', this.handleClick)
        this.view.dom.removeEventListener('scroll', this.handleScroll)
        document.removeEventListener('mousedown', this.handleDocumentMousedown)
        this.eventEmitter.removeEventHandler('changeMode', this.handleChangeMode)
    }

    hide() {
        if (this.el) {
            removeNode(this.el)
            this.el = null
            this.inputs = {}
        }
    }

    private handleChangeMode = () => {
        this.hide()
    }

    private handleClick = (ev: MouseEvent) => {
        const target = ev.target as HTMLElement

        if (this.view.editable && this.isTarget(target)) {
            this.hide()
            this.open(target)
        }
    }

    private handleScroll = () => {
        this.updatePosition()
    }

    private handleDocumentMousedown = (ev: MouseEvent) => {
        const target = ev.target as HTMLElement

        if (this.el && !this.el.contains(target) && !this.isTarget(target)) {
            this.hide()
        }
    }

    protected show(fields: EditPanelField[]) {
        const el = document.createElement('div')
        const body = document.createElement('div')

        el.className = `${cls('popup')} ${cls('edit-panel')} ${this.className}`
        el.setAttribute('aria-label', this.ariaLabel)
        body.className = cls('popup-body')

        fields.forEach(({ name, label, value, disabled }) => {
            const labelEl = document.createElement('label')
            const input = document.createElement('input')

            fieldId += 1
            input.id = `uf-edit-panel-input-${fieldId}`
            input.type = 'text'
            input.name = name
            input.value = value
            labelEl.htmlFor = input.id
            labelEl.textContent = label

            if (disabled) {
                input.disabled = true
                input.classList.add('disabled')
            }

            input.addEventListener('keydown', this.handleKeydown)
            body.appendChild(labelEl)
            body.appendChild(input)
            this.inputs[name] = input
        })

        const buttons = document.createElement('div')

        buttons.className = cls('button-container')
        buttons.appendChild(
            this.createButton(this.removeLabel, `${cls('close-button')} ${cls('remove-button')}`, () => {
                this.remove()
                this.close()
            })
        )
        buttons.appendChild(this.createButton(i18n.get('Cancel'), cls('close-button'), this.close))
        buttons.appendChild(this.createButton(i18n.get('OK'), cls('ok-button'), this.submit))
        body.appendChild(buttons)
        el.appendChild(body)

        this.el = el
        this.view.dom.parentElement!.appendChild(el)
        this.updatePosition()
    }

    private createButton(text: string, className: string, onClick: () => void) {
        const button = document.createElement('button')

        button.type = 'button'
        button.tabIndex = 0
        button.className = className
        button.textContent = text
        button.addEventListener('click', onClick)

        return button
    }

    private handleKeydown = (ev: KeyboardEvent) => {
        if (ev.key === 'Enter') {
            ev.preventDefault()
            this.submit()
        } else if (ev.key === 'Escape') {
            ev.preventDefault()
            this.close()
        }
    }

    private submit = () => {
        const values: Record<string, string> = {}

        Object.keys(this.inputs).forEach((name) => {
            const input = this.inputs[name]

            input.classList.remove('wrong')
            values[name] = input.value
        })

        if (this.save(values)) {
            this.close()
        }
    }

    protected markInvalid(name: string) {
        this.inputs[name].classList.add('wrong')
    }

    private close = () => {
        this.hide()
        this.view.focus()
    }

    protected updatePosition() {
        const targetEl = this.getTargetElement()

        if (!this.el || !targetEl) {
            return
        }

        const container = this.view.dom.parentElement!
        const containerRect = container.getBoundingClientRect()
        const targetRect = targetEl.getBoundingClientRect()
        const { offsetWidth, offsetHeight } = this.el
        const below = targetRect.bottom - containerRect.top + GAP
        const above = targetRect.top - containerRect.top - offsetHeight - GAP
        const top = below + offsetHeight > containerRect.height && above >= 0 ? above : below
        const maxLeft = Math.max(containerRect.width - offsetWidth, 0)
        const left = Math.min(Math.max(targetRect.left - containerRect.left, 0), maxLeft)

        css(this.el, { top: `${top}px`, left: `${left}px` })
    }
}
