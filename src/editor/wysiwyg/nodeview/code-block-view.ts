import { EditorView, NodeView, ViewMutationRecord } from 'prosemirror-view'
import { Node as ProsemirrorNode } from 'prosemirror-model'

import { Emitter } from '../../types/event'
import { removeNode, setAttributes } from '../../utils/dom'
import { getCustomAttrs } from '../helper/node'

import { css, isFunction } from '../../utils/native'
import { createLanguageLabel } from './language-label'

type GetPos = (() => number) | boolean

interface InputPos {
    top: number
    right: number
}

const WRAPPER_CLASS_NAME = 'uf-ww-code-block'
const CODE_BLOCK_LANG_CLASS_NAME = 'uf-ww-code-block-language'

export class CodeBlockView implements NodeView {
    dom!: HTMLElement

    contentDOM: HTMLElement | null = null

    private node: ProsemirrorNode

    private view: EditorView

    private getPos: GetPos

    private eventEmitter: Emitter

    private input: HTMLElement | null = null

    private timer: ReturnType<typeof setTimeout> | null = null

    constructor(node: ProsemirrorNode, view: EditorView, getPos: GetPos, eventEmitter: Emitter) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.eventEmitter = eventEmitter

        this.createElement()
        this.bindEvent()
    }

    private createElement() {
        const { language } = this.node.attrs
        const wrapper = document.createElement('div')

        wrapper.setAttribute('data-language', language || 'text')
        wrapper.className = WRAPPER_CLASS_NAME

        const pre = this.createCodeBlockElement()
        const code = pre.firstChild as HTMLElement

        wrapper.append(pre, createLanguageLabel(language || 'text', () => this.openLanguageEditor()))

        this.dom = wrapper
        this.contentDOM = code
    }

    private createCodeBlockElement() {
        const pre = document.createElement('pre')
        const code = document.createElement('code')
        const { language } = this.node.attrs
        const attrs = getCustomAttrs(this.node.attrs)

        if (language) {
            code.setAttribute('data-language', language)
        }
        setAttributes(attrs, pre)

        pre.appendChild(code)

        return pre
    }

    private createLanguageEditor({ top, right }: InputPos) {
        const wrapper = document.createElement('span')

        wrapper.className = CODE_BLOCK_LANG_CLASS_NAME

        const input = document.createElement('input')

        input.type = 'text'
        input.value = this.node.attrs.language

        wrapper.appendChild(input)
        this.view.dom.parentElement!.appendChild(wrapper)
        const wrpperWidth = wrapper.clientWidth

        css(wrapper, {
            top: `${top + 10}px`,
            left: `${right - wrpperWidth - 10}px`,
            width: `${wrpperWidth}px`
        })

        this.input = input
        this.input.addEventListener('blur', () => this.changeLanguage())
        this.input.addEventListener('keydown', this.handleKeydown)

        this.clearTimer()
        this.timer = setTimeout(() => {
            this.input!.focus()
        })
    }

    private bindEvent() {
        this.eventEmitter.listen('scroll', () => {
            if (this.input) {
                this.reset()
            }
        })
        // the language editor has a fixed position, so it is closed when the page is scrolled
        window.addEventListener('scroll', this.handleWindowScroll)
    }

    private handleWindowScroll = () => {
        if (this.input) {
            this.reset()
        }
    }

    private openLanguageEditor() {
        if (isFunction(this.getPos)) {
            const { top, right } = this.view.coordsAtPos(this.getPos())

            this.createLanguageEditor({ top, right })
        }
    }

    private handleKeydown = (ev: KeyboardEvent) => {
        if (ev.key === 'Enter' && this.input) {
            ev.preventDefault()
            this.changeLanguage()
        }
    }

    private changeLanguage() {
        if (this.input && isFunction(this.getPos)) {
            const { value } = this.input as HTMLInputElement

            this.reset()

            const pos = this.getPos()
            const { tr } = this.view.state

            tr.setNodeMarkup(pos, null, { language: value })
            this.view.dispatch(tr)
        }
    }

    private reset() {
        if (this.input?.parentElement) {
            const parent = this.input.parentElement

            this.input = null
            removeNode(parent)
        }
    }

    private clearTimer() {
        if (this.timer) {
            clearTimeout(this.timer)
            this.timer = null
        }
    }

    stopEvent() {
        return true
    }

    // changes outside the code, like in the language label, aren't content
    ignoreMutation(record: ViewMutationRecord) {
        return record.type !== 'selection' && !this.contentDOM?.contains(record.target)
    }

    update(node: ProsemirrorNode) {
        if (!node.sameMarkup(this.node)) {
            return false
        }

        this.node = node

        return true
    }

    destroy() {
        this.reset()
        this.clearTimer()
        window.removeEventListener('scroll', this.handleWindowScroll)
    }
}
