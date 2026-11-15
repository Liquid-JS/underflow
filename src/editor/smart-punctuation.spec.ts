import { Editor } from './editor'
import { Viewer } from './viewer'
import { renderMarkdown } from './render-markdown'
import { cls } from './utils/dom'

const markdown = '"It\'s" -- one... `"code" -- ...`'
const plain = '"It\'s" -- one... "code" -- ...'
const smart = '“It’s” – one… "code" -- ...'

/** The text of rendered markdown. */
function contents(element: Element) {
    return element.querySelector(`.${cls('contents')}`)!.textContent!.trim()
}

describe('smartPunctuation', () => {
    let container: HTMLElement

    beforeEach(() => {
        container = document.createElement('div')
        document.body.appendChild(container)
    })

    afterEach(() => {
        container.remove()
    })

    describe('in the editor', () => {
        let editor: Editor

        const preview = () => contents(editor.getEditorElements().mdPreview!)

        afterEach(() => editor.destroy())

        it('should show typographic punctuation in the preview, and keep the markdown as written', () => {
            editor = new Editor({ el: container, initialValue: markdown, smartPunctuation: true })

            expect(preview()).toBe(smart)
            expect(editor.getMarkdown()).toBe(markdown)
        })

        it('should show it in the text as it changes', () => {
            editor = new Editor({ el: container, initialValue: 'one', smartPunctuation: true })

            editor.moveCursorToEnd(false)
            editor.insertText(' -- "two"...')

            expect(preview()).toBe('one – “two”…')
            expect(editor.getMarkdown()).toBe('one -- "two"...')
        })

        it('should keep the text as written in the WYSIWYG mode, and back in the markdown', () => {
            editor = new Editor({ el: container, initialValue: markdown, smartPunctuation: true })

            editor.changeMode('wysiwyg')
            expect(editor.getEditorElements().wwEditor!.textContent).toBe('"It\'s" -- one... "code" -- ...')

            editor.changeMode('markdown')
            expect(editor.getMarkdown()).toBe(markdown)
            expect(preview()).toBe(smart)
        })

        it('should show the text as written without it', () => {
            editor = new Editor({ el: container, initialValue: markdown })

            expect(preview()).toBe(plain)
        })
    })

    it('should show typographic punctuation in the viewer', () => {
        const viewer = new Viewer({ el: container, initialValue: markdown, smartPunctuation: true })

        expect(contents(container)).toBe(smart)
        viewer.destroy()
    })

    it('should render typographic punctuation with renderMarkdown()', () => {
        const text = (html: string) => new DOMParser().parseFromString(html, 'text/html').body.textContent!.trim()

        expect(text(renderMarkdown(markdown, { smartPunctuation: true }))).toBe(smart)
        expect(text(renderMarkdown(markdown))).toBe(plain)
    })
})
