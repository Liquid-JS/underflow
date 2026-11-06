import { oneLineTrim } from 'common-tags'

import { DOMParser } from 'prosemirror-model'

import { EventEmitter } from '../event/event-emitter'
import { sanitizeHTML } from '../sanitizer/html-sanitizer'
import { cls } from '../utils/dom'
import { createHTMLrenderer } from '../../../test/markdown'
import { createHTMLSchemaMap } from './nodes/html'
import { WwToDOMAdaptor } from './adaptor/ww-to-dom-adaptor'
import { WysiwygEditor } from './ww-editor'

vi.useFakeTimers()

describe('WysiwygEditor', () => {
    let wwe: WysiwygEditor; let em: EventEmitter; let el: HTMLElement

    function assertToContainHTML(html: string) {
        expect(wwe.view.dom.innerHTML).toContain(html)
    }

    function setContent(content: string) {
        const wrapper = document.createElement('div')

        wrapper.innerHTML = content

        const nodes = DOMParser.fromSchema(wwe.schema).parse(wrapper)

        wwe.setModel(nodes)
    }

    beforeEach(() => {
        const htmlRenderer = createHTMLrenderer()
        const toDOMAdaptor = new WwToDOMAdaptor({}, htmlRenderer)
        const htmlSchemaMap = createHTMLSchemaMap(htmlRenderer, sanitizeHTML, toDOMAdaptor)

        em = new EventEmitter()
        wwe = new WysiwygEditor(em, { toDOMAdaptor, htmlSchemaMap })
        el = wwe.el
        document.body.appendChild(el)
    })

    afterEach(() => {
        vi.clearAllTimers()
        if (Object.keys(wwe).length) {
            wwe.destroy()
        }
        document.body.removeChild(el)
    })

    describe('API', () => {
        it('destroy() initialize instance object', () => {
            wwe.destroy()

            expect(wwe).toEqual({})
        })

        it('focus() enable editor\'s dom selection state', () => {
            wwe.focus()

            // run setTimeout function when focusing the editor
            vi.runAllTimers()

            expect(document.activeElement).toEqual(wwe.view.dom)
        })

        it('blur() disable editor\'s dom selection state', () => {
            wwe.focus()
            wwe.blur()

            expect(document.activeElement).not.toEqual(wwe.view.dom)
        })

        it('setHeight() change height of editor', () => {
            wwe.setHeight(50)

            expect(wwe.el.style.height).toBe('50px')
        })

        it('setMinHeight() change minimum height of editor', () => {
            wwe.setMinHeight(50)

            expect(wwe.el.style.minHeight).toBe('50px')
        })

        it('setPlaceholder() attach placeholder element', () => {
            wwe.setPlaceholder('placeholder text')

            assertToContainHTML(oneLineTrim`

          <span class="placeholder ProseMirror-widget">placeholder text</span>
      `)
        })

        it('scrollTo() move scroll position', () => {
            setContent(oneLineTrim`
        <p>foo</p>
        <p><br></p>
        <p><br></p>
        <p><br></p>
        <p><br></p>
        <p><br></p>
        <p><br></p>
        <p><br></p>
      `)

            wwe.setHeight(50)
            wwe.setScrollTop(30)

            expect(wwe.getScrollTop()).toBe(30)
        })

        it('getSelection() return selection range as array', () => {
            setContent(oneLineTrim`
        <p>foo</p>
        <p>bar</p>
        <p>baz</p>
      `)

            wwe.setSelection(13, 2)

            expect(wwe.getSelection()).toEqual([2, 13])
        })

        it('replaceSelection() change text of selection range', () => {
            setContent(oneLineTrim`
        <p>foo</p>
        <p>bar</p>
      `)

            wwe.setSelection(3, 7)
            wwe.replaceSelection('new foo\nnew bar')

            assertToContainHTML(oneLineTrim`
        <p>fonew foo</p>
        <p>new barar</p>
      `)
        })

        it('addWidget API', () => {
            const ul = document.createElement('ul')

            ul.innerHTML = `
        <li>Ryu</li>
        <li>Lee</li>
      `

            wwe.addWidget(ul, 'top')

            expect(document.body).toContainElement(ul)

            wwe.blur()

            expect(document.body).not.toContainElement(ul)
        })

        it('addWidget() should place the widget below or above the cursor\'s line', () => {
            const ul = document.createElement('ul')

            vi.spyOn(wwe.view, 'coordsAtPos').mockReturnValue({ top: 100, bottom: 120, left: 10, right: 10 })
            vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ top: 0, left: 0 } as DOMRect)
            Object.defineProperty(ul, 'offsetHeight', { value: 50 })

            wwe.addWidget(ul, 'bottom')

            // the line's bottom, overlapping it by 5px
            expect(ul.style.top).toBe('115px')

            wwe.addWidget(ul, 'top')

            // the widget's bottom at the line's top, overlapping it by 5px
            expect(ul.style.top).toBe('55px')

            vi.restoreAllMocks()
        })
    })

    it('should emit \'changeToolbarState\' event when changing cursor', () => {
        setContent(oneLineTrim`
      <p>foo</p>
      <p>bar</p>
    `)

        const spy = vi.fn()

        em.listen('changeToolbarState', spy)

        wwe.setSelection(3, 3)

        expect(spy).toHaveBeenCalled()
    })

    describe('paste', () => {
        it('should make every line of pasted text a paragraph, keeping empty lines', () => {
            // jsdom has no ClipboardEvent, which pasteText() creates
            const { ClipboardEvent: original } = globalThis as any;

            (globalThis as any).ClipboardEvent ??= class extends Event {
                clipboardData = null
            }

            wwe.view.pasteText('one\n\n\ntwo\r\nthree')

            expect(wwe.getHTML()).toBe('<p>one</p><p><br></p><p><br></p><p>two</p><p>three</p>');

            (globalThis as any).ClipboardEvent = original
        })

        it('should give the rows of a pasted table the same number of cells', () => {
            const ev = new Event('paste', { bubbles: true, cancelable: true })
            const html = '<table><tr><th>a</th><th>b</th><th>c</th></tr><tr><td>1</td></tr><tr><td>2</td><td>3</td></tr></table>'

            Object.defineProperty(ev, 'clipboardData', {
                value: { items: [], getData: (type: string) => (type === 'text/html' ? html : '') }
            })
            wwe.view.dom.dispatchEvent(ev)

            const rows = Array.from(wwe.view.dom.querySelectorAll('tr')).map((row) => row.children.length)

            expect(rows).toEqual([3, 3, 3])
        })

        describe('images with a data URL', () => {
            const png = 'data:image/png;base64,iVBORw0KGgo='

            function paste(html: string) {
                const ev = new Event('paste', { bubbles: true, cancelable: true })
                const data: Record<string, string> = { 'text/html': html, 'text/plain': '' }

                Object.defineProperty(ev, 'clipboardData', {
                    value: { items: [], getData: (type: string) => data[type] ?? '' }
                })
                wwe.view.dom.dispatchEvent(ev)
            }

            it('should go to the addImageBlobHook instead of the document', async () => {
                const hook = vi.fn()

                em.listen('addImageBlobHook', hook)
                paste(`<p>a <img src="${png}" alt="pic"> <img src="https://example.com/b.png"></p>`)
                await Promise.resolve()

                expect(wwe.getHTML()).toBe('<p>a  <img src="https://example.com/b.png"><br></p>')
                expect(hook).toHaveBeenCalledTimes(1)

                const [file, , type] = hook.mock.calls[0]

                expect([file.type, type]).toEqual(['image/png', 'paste'])
            })

            it('should be dropped without an addImageBlobHook', async () => {
                paste(`<img src="${png}">`)
                await Promise.resolve()

                expect(wwe.getHTML()).toBe('<p><br></p>')
            })

            it('should stay in content copied from the editor', async () => {
                const hook = vi.fn()

                em.listen('addImageBlobHook', hook)
                paste(`<p data-pm-slice="1 1 []">a <img src="${png}"></p>`)
                await Promise.resolve()

                expect(wwe.getHTML()).toContain(`<img src="${png}">`)
                expect(hook).not.toHaveBeenCalled()
            })
        })
    })

    describe('toolbar state of block items that can not be nested in a table cell', () => {
        const notNestable = ['heading', 'table', 'thematicBreak', 'codeBlock']

        function getToolbarStateAt(text: string) {
            const spy = vi.fn()
            let pos = -1

            wwe.view.state.doc.descendants((node, nodePos) => {
                if (pos < 0 && node.isText && node.text === text) {
                    pos = nodePos + 1
                }
            })
            em.listen('changeToolbarState', spy)
            wwe.setSelection(pos, pos)

            return spy.mock.calls[spy.mock.calls.length - 1][0].toolbarState
        }

        beforeEach(() => {
            setContent(oneLineTrim`
        <p>para</p>
        <ul><li><p>item</p></li></ul>
        <table>
          <thead><tr><th><p>head</p></th></tr></thead>
          <tbody><tr><td><p>cell</p></td></tr></tbody>
        </table>
      `)
        })

        // list items take any block, as in markdown
        it.each(['para', 'item'])('should be enabled in "%s"', (text) => {
            const toolbarState = getToolbarStateAt(text)

            notNestable.forEach((type) => expect(toolbarState[type]?.disabled).toBeFalsy())
        })

        it.each(['head', 'cell'])('should be disabled in "%s"', (text) => {
            const toolbarState = getToolbarStateAt(text)

            notNestable.forEach((type) => expect(toolbarState[type].disabled).toBe(true))
        })
    })

    it('should display html block element properly', () => {
        setContent(
            '<iframe width="420" height="315" src="https://www.youtube.com/embed/XyenY12fzAk"></iframe>'
        )

        assertToContainHTML(
            '<iframe width="420" height="315" src="https://www.youtube.com/embed/XyenY12fzAk" class="html-block ProseMirror-selectednode" draggable="true"></iframe>'
        )
    })

    it('should display html inline element properly', () => {
        setContent('<big class="my-inline">text</big>')

        assertToContainHTML('<p><big class="my-inline">text</big></p>')
    })

    it('should sanitize html element', () => {
        setContent('<iframe width="420" height="315" src="javascript: alert(1);"></iframe>')

        assertToContainHTML(
            '<iframe width="420" height="315" class="html-block ProseMirror-selectednode" draggable="true"></iframe>'
        )
    })

    it('should not escape link url and image url twice', () => {
        setContent(
            '<p><a href="https://a.com/?a=1&amp;b=2">link</a><img src="https://a.com/i.png?a=1&amp;b=2"></p>'
        )

        const link = wwe.view.dom.querySelector('a')!
        const image = wwe.view.dom.querySelector('img')!

        expect(link.getAttribute('href')).toBe('https://a.com/?a=1&b=2')
        expect(image.getAttribute('src')).toBe('https://a.com/i.png?a=1&b=2')
    })

    it('should close the code block language editor when the page is scrolled', () => {
        setContent('<pre><code data-language="js">code</code></pre>')

        vi.spyOn(wwe.view, 'coordsAtPos').mockReturnValue({ top: 0, right: 0, left: 0, bottom: 0 })

        wwe.view.dom.querySelector<HTMLElement>(`.${cls('code-block-label')}`)!.click()

        const getLanguageEditor = () => document.querySelector(`.${cls('ww-code-block-language')}`)

        expect(getLanguageEditor()).not.toBeNull()

        window.dispatchEvent(new Event('scroll'))

        expect(getLanguageEditor()).toBeNull()

        vi.restoreAllMocks()
    })
})
