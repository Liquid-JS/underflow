import { EventEmitter } from '../event/event-emitter'
import { getTextContent } from '../../../test/markdown'
import { MdEditor } from './md-editor'
import { MarkdownDocument } from '@liquid-js/underflow/parser'

function getSelectedText() {
    return document.getSelection()!.toString()
}

function getEditorHTML(editor: MdEditor) {
    return editor.view.dom.innerHTML
}

vi.useFakeTimers()

describe('MdEditor', () => {
    let mde: MdEditor; let em: EventEmitter; let el: HTMLElement

    beforeEach(() => {
        em = new EventEmitter()
        mde = new MdEditor(em, { markdownDocument: new MarkdownDocument() })
        el = mde.el
        document.body.appendChild(el)
    })

    afterEach(() => {
        vi.clearAllTimers()

        mde.destroy()
        document.body.removeChild(el)
    })

    it('should emit updatePreview event when editing the content', () => {
        const spy = vi.fn()

        em.listen('updatePreview', spy)

        mde.setMarkdown('# myText')

        expect(spy).toHaveBeenCalled()
    })

    it('setMarkdown API', () => {
        mde.setMarkdown('# myText')

        expect(getTextContent(mde)).toBe('# myText')
    })

    it('getMarkdown API', () => {
        mde.setMarkdown('# myText')

        const markdown = mde.getMarkdown()

        expect(markdown).toBe('# myText')
    })

    it('setSelection API', () => {
        mde.setMarkdown('# myText')
        mde.setSelection([1, 1], [1, 2])

        // run setTimeout function when focusing the editor
        vi.runAllTimers()

        expect(getSelectedText()).toBe('#')
    })

    it('getSelection API', () => {
        mde.setMarkdown('# myText')
        mde.setSelection([1, 1], [1, 2])

        const selection = mde.getSelection()

        expect(selection).toEqual([
            [1, 1],
            [1, 2]
        ])
    })

    it('setPlaceholder API', () => {
        mde.setPlaceholder('Write something')

        expect(getEditorHTML(mde)).toContain(
            '<span class="placeholder ProseMirror-widget">Write something</span>'
        )
    })

    it('replaceSelection API', () => {
        mde.setMarkdown('# myText')

        mde.setSelection([1, 1], [1, 2])
        mde.replaceSelection('# newText\n#newLine')

        expect(getTextContent(mde)).toBe('# newText\n#newLine myText')
    })

    it('focus API', () => {
        mde.focus()

        // run setTimeout function when focusing the editor
        vi.runAllTimers()

        expect(document.activeElement).toEqual(mde.view.dom)
    })

    it('blur API', () => {
        mde.focus()
        mde.blur()

        expect(document.activeElement).not.toEqual(mde.view.dom)
    })

    it('setHeight API', () => {
        mde.setHeight(100)

        const { height } = mde.el.style

        expect(height).toBe('100px')
    })

    it('setMinHeight API', () => {
        mde.setMinHeight(100)

        const { minHeight } = mde.el.style

        expect(minHeight).toBe('100px')
    })

    it('addWidget API', () => {
        const ul = document.createElement('ul')

        ul.innerHTML = `
      <li>Ryu</li>
      <li>Lee</li>
    `

        mde.addWidget(ul, 'top')

        expect(document.body).toContainElement(ul)

        mde.blur()

        expect(document.body).not.toContainElement(ul)
    })

    describe('paste', () => {
        function paste(data: Record<string, string>, files: File[] = []) {
            const ev = new Event('paste', { bubbles: true, cancelable: true })
            const items = [
                ...Object.keys(data).map((type) => ({ kind: 'string', type, getAsFile: () => null })),
                ...files.map((file) => ({ kind: 'file', type: file.type, getAsFile: () => file }))
            ]

            Object.defineProperty(ev, 'clipboardData', {
                value: { items, getData: (type: string) => data[type] ?? '' }
            })
            mde.view.dom.dispatchEvent(ev)

            return ev
        }

        it('should insert the text as plain lines, not the HTML', () => {
            mde.setMarkdown('a')
            mde.setSelection([1, 2], [1, 2])

            const ev = paste({ 'text/plain': ' **b**\nc', 'text/html': '<p><b>b</b></p><p>c</p>' })

            expect(ev.defaultPrevented).toBe(true)
            expect(mde.getMarkdown()).toBe('a **b**\nc')
        })

        it('should pass an image file to the addImageBlobHook', () => {
            const hook = vi.fn()
            const image = new File(['x'], 'image.png', { type: 'image/png' })

            em.listen('addImageBlobHook', hook)
            mde.setMarkdown('a')
            paste({}, [image])

            expect(hook).toHaveBeenCalledWith(image, expect.any(Function), 'paste')
            expect(mde.getMarkdown()).toBe('a')
        })

        it('should insert the text of an Office document, not its image', () => {
            const hook = vi.fn()

            em.listen('addImageBlobHook', hook)
            mde.setMarkdown('')
            paste({ 'text/plain': 'text', 'text/rtf': '{\\rtf1 text}' }, [new File(['x'], 'image.png', { type: 'image/png' })])

            expect(hook).not.toHaveBeenCalled()
            expect(mde.getMarkdown()).toBe('text')
        })
    })
})
