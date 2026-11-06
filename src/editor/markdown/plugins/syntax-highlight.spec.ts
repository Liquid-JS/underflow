import { source } from 'common-tags'
import { MdEditor } from '../md-editor'
import { EventEmitter } from '../../event/event-emitter'
import { MarkdownDocument } from '@liquid-js/underflow/parser'

function getEditorHTML(editor: MdEditor) {
    return editor.view.dom.innerHTML
}

let mde: MdEditor; let em: EventEmitter

beforeEach(() => {
    em = new EventEmitter()
    mde = new MdEditor(em, { markdownDocument: new MarkdownDocument() })
})

afterEach(() => {
    mde.destroy()
})

describe('markdown editor syntax highlight', () => {
    it('atx heading', () => {
        mde.setMarkdown('# heading')

        const html = getEditorHTML(mde)

        expect(html).toMatchSnapshot()
    })

    it('seText heading', () => {
        mde.setMarkdown('heading\n---')

        const html = getEditorHTML(mde)

        expect(html).toMatchSnapshot()
    })

    describe('blockQuote', () => {
        it('basic', () => {
            mde.setMarkdown('> block quote')

            const html = getEditorHTML(mde)

            expect(html).toMatchSnapshot()
        })

        it('with list', () => {
            mde.setMarkdown('> * [ ] block quote')

            const html = getEditorHTML(mde)

            expect(html).toMatchSnapshot()
        })
    })

    it('bulletList', () => {
        mde.setMarkdown('* bullet list')

        const html = getEditorHTML(mde)

        expect(html).toMatchSnapshot()
    })

    it('orderedList', () => {
        mde.setMarkdown('1. ordered list')

        const html = getEditorHTML(mde)

        expect(html).toMatchSnapshot()
    })

    it('tastkList', () => {
        mde.setMarkdown('* [x] task list')

        const html = getEditorHTML(mde)

        expect(html).toMatchSnapshot()
    })

    describe('table', () => {
        it('basic', () => {
            const input = source`
          | col2 | col2
          | --- | ---
          | data1 | data2 |
        `

            mde.setMarkdown(input)

            const html = getEditorHTML(mde)

            expect(html).toMatchSnapshot()
        })

        it('with mark', () => {
            const input = source`
          | col2 | col2
          | --- | ---
          | data1 | **data2** |
        `

            mde.setMarkdown(input)

            const html = getEditorHTML(mde)

            expect(html).toMatchSnapshot()
        })
    })

    it('thematicBreak', () => {
        mde.setMarkdown('---')

        const html = getEditorHTML(mde)

        expect(html).toMatchSnapshot()
    })

    it('emph', () => {
        mde.setMarkdown('*emph*')

        const html = getEditorHTML(mde)

        expect(html).toMatchSnapshot()
    })

    it('strong', () => {
        mde.setMarkdown('**strong**')

        const html = getEditorHTML(mde)

        expect(html).toMatchSnapshot()
    })

    it('strike', () => {
        mde.setMarkdown('~~strike~~')

        const html = getEditorHTML(mde)

        expect(html).toMatchSnapshot()
    })

    it('inline code', () => {
        mde.setMarkdown('`inline code`')

        const html = getEditorHTML(mde)

        expect(html).toMatchSnapshot()
    })

    it('link', () => {
        mde.setMarkdown('[Example](https://docs.example.com)')

        const html = getEditorHTML(mde)

        expect(html).toMatchSnapshot()
    })

    it('image', () => {
        mde.setMarkdown('![Logo](https://picsum.photos/200)')

        const html = getEditorHTML(mde)

        expect(html).toMatchSnapshot()
    })

    it('code block', () => {
        mde.setMarkdown('```js\nconsole.log("editor")\n```')

        const html = getEditorHTML(mde)

        expect(html).toMatchSnapshot()
    })

    it('code block within list', () => {
        mde.setMarkdown('* list\n  ```js\n  console.log("editor")\n  ```')

        const html = getEditorHTML(mde)

        expect(html).toMatchSnapshot()
    })

    it('custom block', () => {
        mde.setMarkdown('$$custom\nmy custom element\n$$')

        const html = getEditorHTML(mde)

        expect(html).toMatchSnapshot()
    })
})

describe('cursor line highlight', () => {
    beforeEach(() => {
        mde.destroy()
        mde = new MdEditor(em, {
            markdownDocument: new MarkdownDocument(),
            cursorLineHighlight: true
        })
        mde.setMarkdown('line1\nline2\nline3')
    })

    it('should highlight the line of the cursor', () => {
        mde.setSelection([2, 3], [2, 3])

        const highlighted = mde.view.dom.querySelectorAll('.uf-md-cursor-line')

        expect(highlighted).toHaveLength(1)
        expect(highlighted[0]).toHaveTextContent('line2')
    })

    it('should move the highlight with the cursor', () => {
        mde.setSelection([2, 3], [2, 3])
        mde.setSelection([1, 1], [1, 1])

        const highlighted = mde.view.dom.querySelectorAll('.uf-md-cursor-line')

        expect(highlighted).toHaveLength(1)
        expect(highlighted[0]).toHaveTextContent('line1')
    })
})
