import { DOMParser } from 'prosemirror-model'

import { WysiwygEditor } from '../ww-editor'
import { EventEmitter } from '../../event/event-emitter'
import { WwToDOMAdaptor } from '../adaptor/ww-to-dom-adaptor'
import { cls } from '../../utils/dom'

describe('image edit panel', () => {
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
        return wwe.el.querySelector<HTMLElement>(`.${cls('popup-edit-image')}`)
    }

    function getInput(name: string) {
        return getPanel()!.querySelector<HTMLInputElement>(`input[name="${name}"]`)!
    }

    function clickButton(className: string) {
        getPanel()!
            .querySelector<HTMLElement>(`.${cls(className)}`)!
            .click()
    }

    function clickImage() {
        wwe.view.dom.querySelector('img')!.click()
    }

    beforeEach(() => {
        createEditor()
        setContent('<p>foo <img src="https://a.com/a.png" alt="alt text"> bar</p>')
    })

    afterEach(() => {
        document.body.removeChild(wwe.el)
        wwe.destroy()
    })

    it('should be opened by clicking an image', () => {
        clickImage()

        expect(getPanel()).not.toBeNull()
        expect(getInput('imageUrl').value).toBe('https://a.com/a.png')
        expect(getInput('altText').value).toBe('alt text')
    })

    it('should change the url and the description', () => {
        clickImage()
        getInput('imageUrl').value = 'https://b.com/b.png'
        getInput('altText').value = 'new alt'
        clickButton('ok-button')

        expect(getPanel()).toBeNull()
        expect(wwe.getHTML()).toBe('<p>foo <img src="https://b.com/b.png" alt="new alt"> bar</p>')
    })

    it('should not save an empty url', () => {
        clickImage()
        getInput('imageUrl').value = ''
        getInput('imageUrl').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

        expect(getPanel()).not.toBeNull()
        expect(getInput('imageUrl')).toHaveClass('wrong')
    })

    it('should remove the image', () => {
        clickImage()
        clickButton('remove-button')

        expect(getPanel()).toBeNull()
        expect(wwe.getHTML()).toBe('<p>foo  bar</p>')
    })

    it('should edit an image inside a link without opening the link panel', () => {
        setContent('<p><a href="https://a.com"><img src="https://a.com/a.png"></a></p>')
        clickImage()

        expect(wwe.el.querySelector(`.${cls('popup-edit-link')}`)).toBeNull()

        getInput('altText').value = 'alt'
        clickButton('ok-button')

        const image = wwe.view.state.doc.firstChild!.firstChild!

        expect(image.attrs.altText).toBe('alt')
        expect(image.marks[0].attrs.linkUrl).toBe('https://a.com')
    })

    it('should not be opened when it is disabled by the option', () => {
        document.body.removeChild(wwe.el)
        wwe.destroy()
        createEditor({ editPanel: { useImageEditPanel: false } })
        setContent('<p><img src="https://a.com/a.png"></p>')

        clickImage()

        expect(getPanel()).toBeNull()
    })
})
