import { removeNode, cls } from '../utils/dom'
import { css } from '../../../editor/utils/native'
import { icons } from '../../../editor/ui/icons'
import type { Emitter } from '../../../editor/types/event'

export const WRAPPER_CLASS_NAME = 'code-block-language'
export const INPUT_CLASS_NANE = 'code-block-language-input'
export const LIST_CLASS_NAME = 'code-block-language-list'
export const TOGGLE_CLASS_NAME = 'code-block-language-toggle'
export const LANG_ATTR = 'data-language'

const CODE_BLOCK_PADDING = 10

function getButtonsHTML(languages: string[]) {
    return languages
        .map((language) => `<button type="button" data-language="${language}">${language}</button>`)
        .join('')
}

export class LanguageSelectBox {
    private rootEl: HTMLElement

    private eventEmitter: Emitter

    private languages: string[]

    private wrapper!: HTMLElement

    private input!: HTMLInputElement

    private list!: HTMLElement

    private buttons: Element[] = []

    private currentButton!: Element

    private prevStoredLanguage = ''

    constructor(rootEl: HTMLElement, eventEmitter: Emitter, languages: string[]) {
        this.rootEl = rootEl
        this.eventEmitter = eventEmitter
        this.languages = languages

        this.createElement()
        this.bindDOMEvent()
        this.bindEvent()
    }

    private createElement() {
        this.wrapper = document.createElement('div')

        this.wrapper.classList.add(cls(WRAPPER_CLASS_NAME))

        this.createInputElement()
        this.createLanguageListElement()

        this.rootEl.appendChild(this.wrapper)

        this.hide()
    }

    private createInputElement() {
        const wrapper = document.createElement('span')

        wrapper.classList.add(cls(INPUT_CLASS_NANE))

        const input = document.createElement('input')

        input.type = 'text'
        input.setAttribute('maxlength', '20')

        this.input = input

        // toggles the list; the input keeps the focus
        const toggle = document.createElement('button')

        toggle.type = 'button'
        toggle.tabIndex = -1
        toggle.classList.add(cls(TOGGLE_CLASS_NAME))
        toggle.innerHTML = `<span class="${cls('icon')}" aria-hidden="true">${icons['chevron-down']}</span>`

        wrapper.append(this.input, toggle)
        this.wrapper.appendChild(wrapper)
    }

    private createLanguageListElement() {
        this.list = document.createElement('div')
        this.list.classList.add(cls(LIST_CLASS_NAME))

        const buttonsContainer = document.createElement('div')

        buttonsContainer.classList.add('buttons')
        buttonsContainer.innerHTML = getButtonsHTML(this.languages)

        this.buttons = Array.from(buttonsContainer.children)
        this.list.appendChild(buttonsContainer)
        this.wrapper.appendChild(this.list)

        this.activateButtonByIndex(0)
        this.hideList()
    }

    private bindDOMEvent() {
        this.wrapper.addEventListener('mousedown', this.onSelectToggleButton)
        this.input.addEventListener('keydown', this.handleKeydown)
        this.input.addEventListener('focus', () => this.activateSelectBox())
        this.input.addEventListener('blur', () => this.inactivateSelectBox())
        this.wrapper.addEventListener('focusout', this.handleFocusout)
        this.list.addEventListener('mousedown', this.onSelectLanguageButtons)
    }

    // moving the focus elsewhere, like with Tab, closes the picker
    private handleFocusout = (ev: FocusEvent) => {
        const next = ev.relatedTarget as Node | null

        if (next && !this.wrapper.contains(next)) {
            this.eventEmitter.emit('finishLanguageEditing')
        }
    }

    private bindEvent() {
        this.eventEmitter.listen('showCodeBlockLanguages', this.showLangugaeSelectBox)
    }

    private onSelectToggleButton = (ev: MouseEvent) => {
        if ((ev.target as HTMLElement).closest(`.${cls(TOGGLE_CLASS_NAME)}`)) {
            ev.preventDefault()
            this.toggleFocus()
        }
    }

    private onSelectLanguageButtons = (ev: MouseEvent) => {
        const target = ev.target as HTMLElement
        const language = target.getAttribute(LANG_ATTR)

        if (language) {
            this.selectLanguage(language)
        }
    }

    private handleKeydown = (ev: KeyboardEvent) => {
        const { key } = ev

        if (key === 'ArrowUp') {
            this.selectPrevLanguage()
            ev.preventDefault()
        } else if (key === 'ArrowDown') {
            this.selectNextLanguage()
            ev.preventDefault()
        } else if (key === 'Enter' || key === 'Tab') {
            this.storeInputLanguage()
            ev.preventDefault()
        } else {
            this.hideList()
        }
    }

    private showLangugaeSelectBox = (
        { top, right }: { top: number, right: number },
        language: string
    ) => {
        if (language) {
            this.setLanguage(language)
        }

        this.show()

        const { width } = this.input.parentElement!.getBoundingClientRect()

        css(this.wrapper!, {
            top: `${top + CODE_BLOCK_PADDING}px`,
            left: `${right - width - CODE_BLOCK_PADDING}px`
        })

        this.toggleFocus()
    }

    private activateSelectBox() {
        this.wrapper.classList.add('active')
        css(this.list, { display: 'block' })
    }

    private inactivateSelectBox() {
        this.input!.value = this.prevStoredLanguage
        this.wrapper.classList.remove('active')
        this.hideList()
    }

    private toggleFocus() {
        if (this.wrapper.classList.contains('active')) {
            this.input.blur()
        } else {
            this.input.focus()
        }
    }

    private storeInputLanguage() {
        const selectedLanguage = this.input!.value

        this.setLanguage(selectedLanguage)
        this.hideList()

        this.eventEmitter.emit('selectLanguage', selectedLanguage)
    }

    private activateButtonByIndex(index: number) {
        if (this.currentButton) {
            this.currentButton.classList.remove('active')
        }

        if (this.buttons.length) {
            this.currentButton = this.buttons[index]
            this.input!.value = this.currentButton.getAttribute(LANG_ATTR)!
            this.currentButton.classList.add('active')
            this.currentButton.scrollIntoView()
        }
    }

    private selectLanguage(selectedLanguage: string) {
        this.input!.value = selectedLanguage
        this.storeInputLanguage()
    }

    private selectPrevLanguage() {
        let index = this.buttons.indexOf(this.currentButton) - 1

        if (index < 0) {
            index = this.buttons.length - 1
        }

        this.activateButtonByIndex(index)
    }

    private selectNextLanguage() {
        let index = this.buttons.indexOf(this.currentButton) + 1

        if (index >= this.buttons.length) {
            index = 0
        }

        this.activateButtonByIndex(index)
    }

    private hideList() {
        css(this.list, { display: 'none' })
    }

    show() {
        css(this.wrapper!, { display: 'inline-block' })
    }

    hide() {
        css(this.wrapper!, { display: 'none' })
    }

    setLanguage(language: string) {
        this.prevStoredLanguage = language
        this.input!.value = language

        const item = this.buttons.filter((button) => button.getAttribute(LANG_ATTR) === language)

        if (item.length) {
            const index = this.buttons.indexOf(item[0])

            this.activateButtonByIndex(index)
        }
    }

    destroy() {
        removeNode(this.wrapper)
        this.eventEmitter.removeEventHandler('showCodeBlockLanguages', this.showLangugaeSelectBox)
    }
}
