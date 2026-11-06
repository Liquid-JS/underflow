import type { EditorView, NodeView, ViewMutationRecord } from 'prosemirror-view'
import type { Node as ProsemirrorNode } from 'prosemirror-model'

import { cls } from '../utils/dom'
import { isFunction } from '../../../editor/utils/native'
import { createLanguageLabel } from '../../../editor/wysiwyg/nodeview/language-label'
import { LanguageSelectBox, WRAPPER_CLASS_NAME as PICKER_CLASS_NAME } from './language-select-box'
import type { Emitter } from '@liquid-js/underflow'

type GetPos = (() => number) | boolean

interface CodeBlockPos { top: number, right: number }

const WRAPPER_CLASS_NAME = 'ww-code-block-highlighting'

function getCustomAttrs(attrs: Record<string, any>) {
    const { htmlAttrs, classNames } = attrs

    return { ...htmlAttrs, class: classNames ? classNames.join(' ') : null }
}

class CodeSyntaxHighlightView implements NodeView {
    dom!: HTMLElement

    contentDOM: HTMLElement | null = null

    private languageSelectBox: LanguageSelectBox | null = null

    private languageEditing: boolean

    constructor(
        private node: ProsemirrorNode,
        private view: EditorView,
        private getPos: GetPos,
        private eventEmitter: Emitter,
        private languages: string[],
        private isKnownLanguage: (language: string) => boolean
    ) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.eventEmitter = eventEmitter
        this.languageEditing = false
        this.languages = languages

        this.createElement()
        this.bindDOMEvent()
        this.bindEvent()
    }

    private createElement() {
        const { language } = this.node.attrs
        const wrapper = document.createElement('div')

        wrapper.setAttribute('data-language', language || 'text')
        wrapper.classList.add(cls(WRAPPER_CLASS_NAME))

        const pre = this.createCodeBlockElement()
        const code = pre.firstChild as HTMLElement

        if (language) {
            pre.classList.add(`language-${language}`)
            code.classList.add(`language-${language}`)

            // lets highlight.js themes style the block the same way as in the preview
            if (this.isKnownLanguage(language)) {
                code.classList.add('hljs')
            }
        }

        wrapper.append(pre, createLanguageLabel(language || 'text', () => this.onClickEditingButton()))

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

        Object.keys(attrs).forEach((attrName) => {
            if (attrs[attrName]) {
                pre.setAttribute(attrName, attrs[attrName])
            }
        })

        pre.appendChild(code)

        return pre
    }

    private bindDOMEvent() {
        if (this.dom) {
            document.addEventListener('mousedown', this.handleDocumentMousedown, true)
            window.addEventListener('resize', this.finishLanguageEditing)
        }
    }

    private bindEvent() {
        this.eventEmitter.listen('selectLanguage', this.onSelectLanguage)
        this.eventEmitter.listen('scroll', this.finishLanguageEditing)
        this.eventEmitter.listen('finishLanguageEditing', this.finishLanguageEditing)
    }

    private onSelectLanguage = (language: string) => {
        if (this.languageEditing) {
            this.changeLanguage(language)
        }
    }

    private onClickEditingButton = () => {
        if (isFunction(this.getPos)) {
            const pos = this.view.coordsAtPos(this.getPos())

            this.openLanguageSelectBox(pos)
        }
    }

    private openLanguageSelectBox(pos: CodeBlockPos) {
        this.languageSelectBox = new LanguageSelectBox(
            this.view.dom.parentElement!,
            this.eventEmitter,
            this.languages
        )
        this.eventEmitter.emit('showCodeBlockLanguages', pos, this.node.attrs.language)
        this.languageEditing = true
    }

    private changeLanguage(language: string) {
        if (isFunction(this.getPos)) {
            this.reset()

            const pos = this.getPos()
            const { tr } = this.view.state

            tr.setNodeMarkup(pos, null, { language })
            this.view.dispatch(tr)
        }
    }

    // a click anywhere but in the language picker closes it, inside the editor or outside
    private handleDocumentMousedown = (ev: MouseEvent) => {
        if (!(ev.target as Element).closest?.(`.${cls(PICKER_CLASS_NAME)}`)) {
            this.finishLanguageEditing()
        }
    }

    private finishLanguageEditing = () => {
        if (this.languageEditing) {
            this.reset()
        }
    }

    private reset() {
        if (this.languageSelectBox) {
            this.languageSelectBox.destroy()
            this.languageSelectBox = null
        }

        this.languageEditing = false
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

        if (this.dom) {
            document.removeEventListener('mousedown', this.handleDocumentMousedown, true)
            window.removeEventListener('resize', this.finishLanguageEditing)
        }

        this.eventEmitter.removeEventHandler('selectLanguage', this.onSelectLanguage)
        this.eventEmitter.removeEventHandler('scroll', this.finishLanguageEditing)
        this.eventEmitter.removeEventHandler('finishLanguageEditing', this.finishLanguageEditing)
    }
}

export function createCodeSyntaxHighlightView(
    languages: string[],
    isKnownLanguage: (language: string) => boolean
) {
    return (node: ProsemirrorNode, view: EditorView, getPos: GetPos, emitter: Emitter) =>
        new CodeSyntaxHighlightView(node, view, getPos, emitter, languages, isKnownLanguage)
}
