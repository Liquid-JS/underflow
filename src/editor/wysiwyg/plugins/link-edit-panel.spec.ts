import { DOMParser } from 'prosemirror-model'

import { WysiwygEditor } from '../ww-editor'
import { EventEmitter } from '../../event/event-emitter'
import { WwToDOMAdaptor } from '../adaptor/ww-to-dom-adaptor'
import { cls } from '../../utils/dom'

describe('link edit panel', () => {
    let wwe: WysiwygEditor; let em: EventEmitter

    function createEditor(options = {}) {
        em = new EventEmitter()
        wwe = new WysiwygEditor(em, { toDOMAdaptor: new WwToDOMAdaptor({}, {}), ...options })
        document.body.appendChild(wwe.el)
    }

    function setContent(content: string) {
        const wrapper = document.createElement('div')

        wrapper.innerHTML = content
        wwe.setModel(DOMParser.fromSchema(wwe.schema).parse(wrapper))
    }

    function getPanel() {
        return wwe.el.querySelector<HTMLElement>(`.${cls('popup-edit-link')}`)
    }

    function getInput(name: string) {
        return getPanel()!.querySelector<HTMLInputElement>(`input[name="${name}"]`)!
    }

    function clickButton(className: string) {
        getPanel()!
            .querySelector<HTMLElement>(`.${cls(className)}:not(.${cls('remove-button')})`)!
            .click()
    }

    function clickLink() {
        wwe.view.dom.querySelector('a')!.click()
    }

    beforeEach(() => {
        createEditor()
        setContent('<p>foo <a href="https://a.com">bar <strong>baz</strong></a> qux</p>')
    })

    afterEach(() => {
        document.body.removeChild(wwe.el)
        wwe.destroy()
    })

    it('should be opened by clicking a link', () => {
        clickLink()

        expect(getPanel()).not.toBeNull()
        expect(getInput('linkUrl').value).toBe('https://a.com')
        expect(getInput('linkText').value).toBe('bar baz')
    })

    it('should change the url and keep the inner marks if the text is not changed', () => {
        clickLink()
        getInput('linkUrl').value = 'https://b.com'
        clickButton('ok-button')

        expect(getPanel()).toBeNull()
        expect(wwe.getHTML()).toBe(
            '<p>foo <a href="https://b.com">bar </a><strong><a href="https://b.com">baz</a></strong> qux</p>'
        )
    })

    it('should change the link text', () => {
        clickLink()
        getInput('linkText').value = 'new text'
        getInput('linkUrl').value = 'https://b.com'
        getInput('linkUrl').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

        expect(getPanel()).toBeNull()
        expect(wwe.getHTML()).toBe('<p>foo <a href="https://b.com">new text</a> qux</p>')
    })

    it('should not save an empty url', () => {
        clickLink()
        getInput('linkUrl').value = ' '
        clickButton('ok-button')

        expect(getPanel()).not.toBeNull()
        expect(getInput('linkUrl')).toHaveClass('wrong')
    })

    it('should remove the link', () => {
        clickLink()
        getPanel()!
            .querySelector<HTMLElement>(`.${cls('remove-button')}`)!
            .click()

        expect(getPanel()).toBeNull()
        expect(wwe.getHTML()).toBe('<p>foo bar <strong>baz</strong> qux</p>')
    })

    it('should be closed without changes by the cancel button or escape key', () => {
        clickLink()
        getInput('linkUrl').value = 'https://b.com'
        getInput('linkUrl').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

        expect(getPanel()).toBeNull()

        clickLink()
        clickButton('close-button')

        expect(getPanel()).toBeNull()
        expect(wwe.getHTML()).toContain('href="https://a.com"')
    })

    it('should be closed by clicking outside of the panel', () => {
        clickLink()
        document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

        expect(getPanel()).toBeNull()
    })

    it('should be closed when the document is changed', () => {
        clickLink()
        wwe.view.dispatch(wwe.view.state.tr.insertText('a', 1))

        expect(getPanel()).toBeNull()
    })

    it('should not be opened when it is disabled by the option', () => {
        document.body.removeChild(wwe.el)
        wwe.destroy()
        createEditor({ editPanel: { useLinkEditPanel: false } })
        setContent('<p><a href="https://a.com">link</a></p>')

        clickLink()

        expect(getPanel()).toBeNull()
    })
})
