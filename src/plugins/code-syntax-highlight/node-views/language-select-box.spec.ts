import { cls } from '../utils/dom'
import type { Emitter } from '../../../editor/types/event'
import {
    LanguageSelectBox,
    WRAPPER_CLASS_NAME,
    INPUT_CLASS_NANE,
    LIST_CLASS_NAME
} from './language-select-box'

Element.prototype.scrollIntoView = vi.fn()

describe('languageSelectBox', () => {
    let selectBox: LanguageSelectBox
    let eventEmitter: Emitter
    let wrapper: HTMLElement
    let input: HTMLInputElement
    let list: HTMLElement
    let wwContainer: HTMLElement

    beforeEach(() => {
        eventEmitter = {
            emit: vi.fn(),
            emitReduce: vi.fn(),
            listen: vi.fn(),
            removeEventHandler: vi.fn(),
            addEventType: vi.fn(),
            getEvents: vi.fn(),
            holdEventInvoke: vi.fn()
        }

        wwContainer = document.createElement('div')
        wwContainer.className = 'uf-editor ww-mode'
        document.body.appendChild(wwContainer)

        selectBox = new LanguageSelectBox(document.body, eventEmitter, ['js', 'css', 'ts'])

        wrapper = document.body.querySelector(`.${cls(WRAPPER_CLASS_NAME)}`)!
        input = document.body.querySelector(`.${cls(INPUT_CLASS_NANE)} > input`)!
        list = document.body.querySelector(`.${cls(LIST_CLASS_NAME)}`)!
    })

    afterEach(() => {
        selectBox.destroy()
        document.body.removeChild(wwContainer)
    })

    it('should create language select box element', () => {
        expect(wrapper).toHaveClass(`${cls(WRAPPER_CLASS_NAME)}`)
    })

    it('show() should show language select box element', () => {
        selectBox.show()

        expect(wrapper).not.toHaveStyle('display: none')
    })

    it('hide() should hide language select box element', () => {
        selectBox.show()
        selectBox.hide()

        expect(wrapper).toHaveStyle('display: none')
    })

    it('destory() should remove element on body', () => {
        selectBox.destroy()

        expect(wwContainer).toBeEmptyDOMElement()
        expect(eventEmitter.removeEventHandler).toHaveBeenCalled()
    })

    it('setLanguage() should change input value to selected language', () => {
        selectBox.setLanguage('foo')

        expect(input).toHaveValue('foo')
    })

    describe('wrapper element', () => {
        it('should change to active state when input is focused', () => {
            selectBox.show()
            input.focus()

            expect(wrapper).toHaveClass('active')
        })

        it('should change to inactive state when input is focused out', () => {
            input.focus()
            input.blur()

            expect(wrapper).not.toHaveClass('active')
        })
    })

    describe('language list element', () => {
        it('should show when input is focused', () => {
            selectBox.show()
            input.focus()

            expect(list).toHaveStyle('display: block')
        })

        it('should hide when input is focused out', () => {
            input.focus()
            input.blur()

            expect(list).toHaveStyle('display: none')
        })
    })
})
