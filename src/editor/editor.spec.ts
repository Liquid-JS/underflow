import { oneLineTrim, stripIndents, source } from 'common-tags'
import { createHTMLrenderer } from '../../test/markdown'
import { Emitter } from './types/event'
import { EditorOptions, EditorType } from './types/editor'
import { i18n } from './i18n/i18n'
import { Editor } from './editor'
import { Viewer } from './viewer'
import { cls } from './utils/dom'
import * as imageHelper from './helper/image'
import type { OpenTagToken } from '@liquid-js/underflow/parser'

const HEADING_CLS = `${cls('md-heading')} ${cls('md-heading1')}`
const DELIM_CLS = cls('md-delimiter')

describe('editor', () => {
    let container: HTMLElement
    let mdEditor: HTMLElement
    let mdPreview: HTMLElement
    let wwEditor: HTMLElement
    let editor: Editor

    function getPreviewHTML() {
        return mdPreview
            .querySelector(`.${cls('contents')}`)!
            .innerHTML.replace(/\sdata-nodeid="\d+"|\n/g, '')
            .trim()
    }

    describe('instance API', () => {
        beforeEach(() => {
            container = document.createElement('div')
            editor = new Editor({
                el: container,
                previewHighlight: false,
                cursorLineHighlight: false,
                widgetRules: [
                    {
                        rule: /@\S+/,
                        toDOM: (text) => {
                            const span = document.createElement('span')

                            span.innerHTML = `<a href="www.google.com">${text}</a>`
                            return span
                        }
                    }
                ]
            })

            const elements = editor.getEditorElements()

            mdEditor = elements.mdEditor
            mdPreview = elements.mdPreview!
            wwEditor = elements.wwEditor!

            document.body.appendChild(container)
        })

        afterEach(() => {
            editor.destroy()
            document.body.removeChild(container)
        })

        describe('convertPosToMatchEditorMode', () => {
            const mdPos: [number, number] = [2, 1]
            const wwPos = 14

            it('should convert position to match editor mode', () => {
                editor.setMarkdown('Hello World\nwelcome to the world')

                editor.changeMode('wysiwyg')
                expect(editor.convertPosToMatchEditorMode(mdPos)).toEqual([wwPos, wwPos])

                editor.changeMode('markdown')
                expect(editor.convertPosToMatchEditorMode(wwPos)).toEqual([mdPos, mdPos])
            })

            it('should occurs error when types of parameters is not matched', () => {
                expect(() => {
                    editor.convertPosToMatchEditorMode(mdPos, wwPos)
                }).toThrow()
            })
        })

        it('setPlaceholder()', () => {
            editor.setPlaceholder('Please input text')

            const expected = '<span class="placeholder ProseMirror-widget">Please input text</span>'

            expect(mdEditor).toContainHTML(expected)
            expect(wwEditor).toContainHTML(expected)
        })

        describe('getHTML()', () => {
            it('basic', () => {
                editor.setMarkdown('# heading\n* bullet')

                const result = oneLineTrim`
          <h1>heading</h1>
          <ul>
            <li>
              <p>bullet</p>
            </li>
          </ul>
        `

                expect(editor.getHTML()).toBe(result)
            })

            it('should not trigger change event when the mode is wysiwyg', () => {
                const spy = vi.fn()

                editor.changeMode('wysiwyg')
                editor.on('change', spy)
                editor.getHTML()

                expect(spy).not.toHaveBeenCalled()
            })

            it('should be the same as wysiwyg contents', () => {
                const input = source`
          <p>first line</p>
          <p>second line</p>
          <p><br>\nthird line</p>
          <p><br>\n<br>\nfourth line</p>
        `
                const expected = oneLineTrim`
          <p>first line</p>
          <p>second line</p>
          <p><br></p>
          <p>third line</p>
          <p><br></p>
          <p><br></p>
          <p>fourth line</p>
        `

                editor.setHTML(input)

                expect(editor.getHTML()).toBe(expected)
            })

            it('should not contain script urls of links', () => {
                editor.setMarkdown(
                    '[foo](javascript:alert(1)) [bar](VBScript:alert(1)) [baz](http://example.com)'
                )
                editor.changeMode('wysiwyg')
                editor.exec('addLink', { linkUrl: ' java\tscript:alert(1)', linkText: 'qux' })

                expect(editor.getHTML()).toBe(
                    '<p><a>foo</a> <a>bar</a> <a href="http://example.com">baz</a><a>qux</a></p>'
                )
                expect(editor.getMarkdown()).toContain('[foo](javascript:alert(1))')
            })

            it('placeholder should be removed', () => {
                editor.changeMode('wysiwyg')
                editor.setPlaceholder('placeholder')

                const result = oneLineTrim`
          <p><br></p>
        `

                expect(editor.getHTML()).toBe(result)
            })
        })

        it('changeMode()', () => {
            const spy = vi.fn()

            expect(editor.isMarkdownMode()).toBe(true)
            expect(editor.isWysiwygMode()).toBe(false)

            editor.on('changeMode', spy)
            editor.changeMode('wysiwyg')

            expect(spy).toHaveBeenCalledWith('wysiwyg')
            expect(editor.isMarkdownMode()).toBe(false)
            expect(editor.isWysiwygMode()).toBe(true)
        })

        it('changePreviewStyle()', () => {
            const spy = vi.fn()

            expect(editor.getCurrentPreviewStyle()).toBe('tab')

            editor.on('changePreviewStyle', spy)
            editor.changePreviewStyle('vertical')

            expect(spy).toHaveBeenCalledWith('vertical')
            expect(editor.getCurrentPreviewStyle()).toBe('vertical')
        })

        describe('setMarkdown()', () => {
            it('basic', () => {
                editor.setMarkdown('# heading')

                expect(mdEditor).toContainHTML(
                    `<div><span class="${HEADING_CLS}"><span class="${DELIM_CLS}">#</span> heading</span></div>`
                )
                expect(getPreviewHTML()).toBe('<h1>heading</h1>')
            })

            it('should parse the CRLF properly in markdown', () => {
                editor.setMarkdown('# heading\r\nCRLF')

                expect(mdEditor).toContainHTML(
                    `<div><span class="${HEADING_CLS}"><span class="${DELIM_CLS}">#</span> heading</span></div><div>CRLF</div>`
                )
                expect(getPreviewHTML()).toBe('<h1>heading</h1><p>CRLF</p>')
            })

            it('should not focus the editor when focus parameter is false', () => {
                // @ts-expect-error accessing private mdEditor for testing
                const mdFocusSpy = vi.spyOn(editor.mdEditor, 'focus')
                // @ts-expect-error accessing private wwEditor for testing
                const wwFocusSpy = vi.spyOn(editor.wwEditor, 'focus')

                editor.setMarkdown('# heading', true, false)
                editor.changeMode('wysiwyg', true)
                editor.setMarkdown('# heading', true, false)

                expect(mdFocusSpy).not.toHaveBeenCalled()
                expect(wwFocusSpy).not.toHaveBeenCalled()

                editor.setMarkdown('# heading')

                expect(wwFocusSpy).toHaveBeenCalled()
            })
        })

        describe('setHTML()', () => {
            it('basic', () => {
                editor.setHTML('<h1>heading</h1>')

                expect(mdEditor).toContainHTML(
                    `<div><span class="${HEADING_CLS}"><span class="${DELIM_CLS}">#</span> heading</span></div>`
                )
                expect(getPreviewHTML()).toBe('<h1>heading</h1>')
            })

            it('should not throw when the table has no body rows', () => {
                editor.changeMode('wysiwyg')

                expect(() =>
                    editor.setHTML('<table><thead><tr><th>a</th></tr></thead><tbody></tbody></table>')
                ).not.toThrow()
                expect(wwEditor).toContainHTML('<thead><tr><th><p>a</p></th></tr></thead>')
            })

            it('should split merged table cells, keeping every cell', () => {
                editor.changeMode('wysiwyg')
                editor.setHTML(oneLineTrim`
                    <table>
                        <thead><tr><th colspan="2">a</th><th>b</th></tr></thead>
                        <tbody>
                            <tr><td rowspan="2">1</td><td>2</td><td>3</td></tr>
                            <tr><td>5</td><td>6</td></tr>
                        </tbody>
                    </table>
                `)

                const markdown = source`
                    | a |  | b |
                    | --- | --- | --- |
                    | 1 | 2 | 3 |
                    |  | 5 | 6 |
                ` + '\n'

                expect(editor.getMarkdown()).toBe(markdown)
                editor.changeMode('markdown')
                editor.changeMode('wysiwyg')
                expect(editor.getMarkdown()).toBe(markdown)
            })

            it('should parse the br tag as the empty block to separate between blocks', () => {
                editor.setHTML('<p>a<br/>b</p>')

                expect(mdEditor).toContainHTML('<div>a</div><div>b</div>')
                expect(getPreviewHTML()).toBe('<p>a<br>b</p>')
            })

            it('should not focus the editor when focus parameter is false', () => {
                // @ts-expect-error accessing private mdEditor for testing
                const mdFocusSpy = vi.spyOn(editor.mdEditor, 'focus')
                // @ts-expect-error accessing private wwEditor for testing
                const wwFocusSpy = vi.spyOn(editor.wwEditor, 'focus')

                editor.setHTML('<h1>heading</h1>', true, false)
                editor.changeMode('wysiwyg', true)
                editor.setHTML('<h1>heading</h1>', true, false)

                expect(mdFocusSpy).not.toHaveBeenCalled()
                expect(wwFocusSpy).not.toHaveBeenCalled()

                editor.setHTML('<h1>heading</h1>')

                expect(wwFocusSpy).toHaveBeenCalled()
            })

            it('should parse the br tag with the paragraph block to separate between blocks in wysiwyg', () => {
                editor.setHTML(
                    '<h1>test title</h1><p><strong>test bold</strong><br><em>test italic</em><br>normal text</p>'
                )
                editor.changeMode('wysiwyg')

                const expected = oneLineTrim`
          <h1>test title</h1>
          <p><strong>test bold</strong></p>
          <p><em>test italic</em></p>
          <p>normal text</p>
        `

                expect(wwEditor).toContainHTML(expected)
            })

            it('should parse the br tag with the paragraph block to separate between blocks', () => {
                const input = source`
          <p>first line</p>
          <p>second line</p>
          <p><br>\nthird line</p>
          <p><br>\n<br>\nfourth line</p>
        `
                const expected = oneLineTrim`
          <p>first line<br>second line</p>
          <p>third line</p>
          <p><br>fourth line</p>
        `

                editor.setHTML(input)

                expect(getPreviewHTML()).toBe(expected)
            })

            it('should be parsed with the same content when calling setHTML() with getHTML() API result', () => {
                const input = source`
          <p>first line</p>
          <p>second line</p>
          <p><br>\nthird line</p>
          <p><br>\n<br>\nfourth line</p>
        `

                editor.setHTML(input)

                const mdEditorHTML = mdEditor.innerHTML
                const mdPreviewHTML = getPreviewHTML()

                editor.setHTML(editor.getHTML())

                expect(mdEditor).toContainHTML(mdEditorHTML)
                expect(getPreviewHTML()).toBe(mdPreviewHTML)
            })
        })

        it('reset()', () => {
            editor.setMarkdown('# heading')
            editor.reset()

            expect(mdEditor).not.toContainHTML(
                `<div><span class="${HEADING_CLS}"><span class="${DELIM_CLS}">#</span> heading</span></div>`
            )
            expect(getPreviewHTML()).toBe('')
        })

        describe('setMinHeight()', () => {
            it('should set height with pixel option', () => {
                editor.setMinHeight('200px')

                expect(mdEditor).toHaveStyle({ minHeight: '200px' })
                expect(mdPreview).toHaveStyle({ minHeight: '200px' })
                expect(wwEditor).toHaveStyle({ minHeight: '200px' })
            })

            it('should be less than the editor height', () => {
                editor.setMinHeight('400px')

                expect(mdEditor).toHaveStyle({ minHeight: '225px' })
                expect(mdPreview).toHaveStyle({ minHeight: '225px' })
                expect(wwEditor).toHaveStyle({ minHeight: '225px' })
            })
        })

        describe('setHeight()', () => {
            it('should set height with pixel option', () => {
                editor.setHeight('300px')

                expect(container).not.toHaveClass('auto-height')
                expect(container).toHaveStyle({ height: '300px' })
                expect(mdEditor).toHaveStyle({ minHeight: '200px' })
                expect(mdPreview).toHaveStyle({ minHeight: '200px' })
                expect(wwEditor).toHaveStyle({ minHeight: '200px' })
            })

            it('should set height with auto option', () => {
                editor.setHeight('auto')

                expect(container).toHaveClass('auto-height')
                expect(container).toHaveStyle({ height: 'auto' })
                expect(mdEditor).toHaveStyle({ minHeight: '200px' })
                expect(mdPreview).toHaveStyle({ minHeight: '200px' })
                expect(wwEditor).toHaveStyle({ minHeight: '200px' })
            })
        })

        it('addWidget()', () => {
            const node = document.createElement('div')

            node.innerHTML = 'widget'

            editor.addWidget(node, 'top')

            expect(document.body).toContainElement(node)

            editor.changeMode('wysiwyg')

            expect(document.body).not.toContainElement(node)
        })

        it('getHTML() renders the html WYSIWYG keeps as source', () => {
            editor.setMarkdown('<p align="center">x</p>\n\na <kbd>Ctrl</kbd> key\n\n<iframe src="https://x"></iframe>')
            editor.changeMode('wysiwyg')

            expect(editor.getHTML()).toBe('<p align="center">x</p><p>a <kbd>Ctrl</kbd> key</p>')
        })

        describe('cursor when changing the mode', () => {
            it.each([
                ['Hello **World**', [1, 11], 'Hello Wo'],
                ['a `code` b', [1, 6], 'a co'],
                ['see [the link](https://x) here', [1, 10], 'see the '],
                ['- one\n- two three', [2, 6], 'two']
            ] as Array<[string, [number, number], string]>)('keeps the character in %j', (markdown, pos, before) => {
                editor.setMarkdown(markdown)
                editor.setSelection(pos, pos)
                editor.changeMode('wysiwyg')

                // @ts-expect-error accessing the WYSIWYG editor's view for testing
                const { $from } = editor.wwEditor.view.state.selection

                expect($from.parent.textBetween(0, $from.parentOffset)).toBe(before)

                editor.changeMode('markdown')

                expect(editor.getSelection()).toEqual([pos, pos])
            })
        })

        describe('replaceWithWidget()', () => {
            it('in markdown', () => {
                editor.replaceWithWidget([1, 1], [1, 1], '@test')

                // the markdown editor keeps the text, marked as a widget
                expect(mdEditor.querySelector('.uf-md-widget')).toHaveTextContent('@test')
                expect(getPreviewHTML()).toBe(oneLineTrim`
          <p>
            <span class="uf-widget" data-widget="widget0" data-widget-text="@test">
              <span><a href="www.google.com">@test</a></span>
            </span>
          </p>
        `)
            })

            it('in wysiwyg', () => {
                editor.changeMode('wysiwyg')
                editor.replaceWithWidget(1, 1, '@test')

                expect(wwEditor.querySelector('.uf-widget')).toContainHTML(
                    '<span><a href="www.google.com">@test</a></span>'
                )
            })
        })

        it('exec()', () => {
            // @ts-expect-error accessing private commandManager for testing
            vi.spyOn(editor.commandManager, 'exec')

            editor.exec('bold')

            // @ts-expect-error accessing private commandManager for testing
            expect(editor.commandManager.exec).toHaveBeenCalledWith('bold', undefined)
        })

        it('addCommand()', () => {
            const spy = vi.fn()
            // @ts-expect-error accessing private mdEditor for testing
            const { view } = editor.mdEditor
            const { state, dispatch } = view

            editor.addCommand('markdown', 'custom', spy)
            editor.exec('custom', { prop: 'prop' })

            expect(spy).toHaveBeenCalledWith({ prop: 'prop' }, state, dispatch, view)
            expect(spy).toHaveBeenCalled()
        })

        it('should be triggered only once when the event registered by addHook()', () => {
            const spy = vi.fn()
            const { eventEmitter } = editor

            eventEmitter.addEventType('custom')

            editor.addHook('custom', spy)
            editor.addHook('custom', spy)

            eventEmitter.emit('custom')

            expect(spy).toHaveBeenCalledTimes(1)
        })

        describe('insertText()', () => {
            it('in markdown', () => {
                editor.insertText('test')

                expect(mdEditor).toContainHTML('<div>test</div>')
                expect(getPreviewHTML()).toBe('<p>test</p>')
            })

            it('in wysiwyg', () => {
                editor.changeMode('wysiwyg')
                editor.insertText('test')

                expect(wwEditor).toContainHTML('<p>test</p>')
            })
        })

        describe('setSelection(), getSelection()', () => {
            it('in markdown', () => {
                expect(editor.getSelection()).toEqual([
                    [1, 1],
                    [1, 1]
                ])

                editor.setMarkdown('line1\nline2')
                editor.setSelection([1, 2], [2, 4])

                expect(editor.getSelection()).toEqual([
                    [1, 2],
                    [2, 4]
                ])
            })

            it('in wysiwyg', () => {
                editor.changeMode('wysiwyg')

                expect(editor.getSelection()).toEqual([1, 1])

                editor.setMarkdown('line1\nline2')
                editor.setSelection(2, 8)

                expect(editor.getSelection()).toEqual([2, 8])
            })
        })

        describe('moveCursorTo(), getCursorLine()', () => {
            it('in markdown', () => {
                editor.setMarkdown('line1\nline2\nline3')
                editor.moveCursorTo(2, false)

                expect(editor.getSelection()).toEqual([
                    [2, 1],
                    [2, 1]
                ])
                expect(editor.getCursorLine()).toBe(2)

                editor.moveCursorTo(10, false)

                expect(editor.getCursorLine()).toBe(3)
            })

            it('in wysiwyg', () => {
                editor.changeMode('wysiwyg')
                editor.setMarkdown(
                    '# heading\n\n* item1\n* item2\n\n| a | b |\n| --- | --- |\n| c | d |\n\n```\ncode1\ncode2\n```\n\nlast'
                )

                const lines = ['heading', 'item1', 'item2', 'a', 'c', 'code1', 'code2', 'last']

                lines.forEach((text, index) => {
                    editor.moveCursorTo(index + 1, false)

                    const [from] = editor.getSelection() as [number, number]

                    expect(editor.getSelectedText(from, from + text.length)).toBe(text)
                    expect(editor.getCursorLine()).toBe(index + 1)

                    editor.setSelection(from + 1, from + 1)

                    expect(editor.getCursorLine()).toBe(index + 1)
                })
            })
        })

        describe('getCurrentToolbarState()', () => {
            it('in markdown', () => {
                editor.setMarkdown('# heading\n\n* item')
                editor.setSelection([1, 3], [1, 3])

                expect(editor.getCurrentToolbarState().heading).toEqual({ active: true })

                editor.setSelection([3, 4], [3, 4])

                expect(editor.getCurrentToolbarState().bulletList).toEqual({ active: true })
            })

            it('in wysiwyg', () => {
                editor.changeMode('wysiwyg')
                editor.setMarkdown('**bold**\n\n* item')
                editor.setSelection(3, 3)

                expect(editor.getCurrentToolbarState().strong).toEqual({ active: true })

                editor.setSelection(10, 10)

                const toolbarState = editor.getCurrentToolbarState()

                expect(toolbarState.bulletList).toEqual({ active: true })
                expect(toolbarState.heading).toBeUndefined()
            })
        })

        describe('setTheme()', () => {
            it('should change the theme class of the editor and emit changeTheme event', () => {
                const spy = vi.fn()
                const root = container.querySelector(`.${cls('default-ui')}`)!

                editor.on('changeTheme', spy)
                editor.setTheme('dark')

                expect(root).toHaveClass(cls('dark'))
                expect(spy).toHaveBeenCalledWith('dark')

                editor.setTheme('light')

                expect(root).not.toHaveClass(cls('dark'))
                expect(spy).toHaveBeenCalledTimes(2)
            })
        })

        describe('getSelectedText()', () => {
            beforeEach(() => {
                editor.setMarkdown('line1\nline2')
                editor.setSelection([1, 2], [2, 4])
            })

            it('in markdown', () => {
                expect(editor.getSelectedText()).toEqual('ine1\nlin')
                expect(editor.getSelectedText([1, 2], [2, 6])).toEqual('ine1\nline2')
            })

            it('in wysiwyg', () => {
                editor.changeMode('wysiwyg')
                editor.setSelection(2, 11)

                expect(editor.getSelectedText()).toEqual('ine1\nlin')
                expect(editor.getSelectedText(2, 13)).toEqual('ine1\nline2')
            })
        })

        describe('replaceSelection()', () => {
            beforeEach(() => {
                editor.setMarkdown('line1\nline2')
                editor.setSelection([1, 2], [2, 4])
            })

            it('should replace current selection in markdown', () => {
                editor.replaceSelection('Replaced')

                expect(mdEditor).toContainHTML('<div>lReplacede2</div>')
                expect(getPreviewHTML()).toBe('<p>lReplacede2</p>')
            })

            it('should replace current selection in wysiwyg', () => {
                editor.changeMode('wysiwyg')
                editor.setSelection(2, 11)
                editor.replaceSelection('Replaced')

                expect(wwEditor).toContainHTML('<p>lReplacede2</p>')
            })

            it('should replace given selection in markdown', () => {
                editor.replaceSelection('Replaced', [1, 1], [2, 1])

                expect(mdEditor).toContainHTML('<div>Replacedline2</div>')
                expect(getPreviewHTML()).toBe('<p>Replacedline2</p>')
            })

            it('should replace given selection in wysiwyg', () => {
                editor.changeMode('wysiwyg')
                editor.replaceSelection('Replaced', 1, 7)

                expect(wwEditor).toContainHTML('<p>Replaced</p><p>line2</p>')
            })

            it('should parse the CRLF properly in markdown', () => {
                editor.replaceSelection('text\r\nCRLF')

                expect(mdEditor).toContainHTML('<div>ltext</div><div>CRLFe2</div>')
                expect(getPreviewHTML()).toBe('<p>ltext<br>CRLFe2</p>')
            })
        })

        describe('deleteSelection()', () => {
            beforeEach(() => {
                editor.setMarkdown('line1\nline2')
                editor.setSelection([1, 2], [2, 4])
            })

            it('should delete current selection in markdown', () => {
                editor.deleteSelection()

                expect(mdEditor).toContainHTML('<div>le2</div>')
                expect(getPreviewHTML()).toBe('<p>le2</p>')
            })

            it('should delete current selection in wysiwyg', () => {
                editor.changeMode('wysiwyg')
                editor.setSelection(2, 11)
                editor.deleteSelection()

                expect(wwEditor).toContainHTML('<p>le2</p>')
            })

            it('should delete given selection in markdown', () => {
                editor.deleteSelection([1, 1], [2, 1])

                expect(mdEditor).toContainHTML('<div>line2</div>')
                expect(getPreviewHTML()).toBe('<p>line2</p>')
            })

            it('should delete given selection in wysiwyg', () => {
                editor.changeMode('wysiwyg')
                editor.deleteSelection(1, 7)

                expect(wwEditor).toContainHTML('<p>line2</p>')
            })
        })

        describe('getRangeOfNode()', () => {
            beforeEach(() => {
                editor.setMarkdown('line1\nline2 **strong**')
                editor.setSelection([2, 10], [2, 12])
            })

            it('should get the range of the current selected node in markdown', () => {
                const rangeInfo = editor.getRangeInfoOfNode()
                const [start, end] = rangeInfo.range

                expect(rangeInfo).toEqual({
                    range: [
                        [2, 7],
                        [2, 17]
                    ],
                    type: 'strong'
                })

                editor.replaceSelection('Replaced', start, end)

                expect(getPreviewHTML()).toBe('<p>line1<br>line2 Replaced</p>')
            })

            it('should get the range of the current selected node in wysiwyg', () => {
                editor.changeMode('wysiwyg')
                editor.setSelection(15, 15)

                const rangeInfo = editor.getRangeInfoOfNode()
                const [start, end] = rangeInfo.range

                expect(rangeInfo).toEqual({ range: [14, 20], type: 'strong' })

                editor.replaceSelection('Replaced', start, end)

                expect(wwEditor).toContainHTML('<p>line1</p><p>line2 Replaced</p>')
            })

            it('should get the range of selection with given position in markdown', () => {
                const rangeInfo = editor.getRangeInfoOfNode([2, 2])
                const [start, end] = rangeInfo.range

                expect(rangeInfo).toEqual({
                    range: [
                        [2, 1],
                        [2, 7]
                    ],
                    type: 'text'
                })

                editor.replaceSelection('Replaced', start, end)

                expect(getPreviewHTML()).toBe('<p>line1<br>Replaced<strong>strong</strong></p>')
            })

            it('should get the range of selection with given position in wysiwyg', () => {
                editor.changeMode('wysiwyg')

                const rangeInfo = editor.getRangeInfoOfNode(10)
                const [start, end] = rangeInfo.range

                expect(rangeInfo).toEqual({ range: [8, 14], type: 'text' })

                editor.replaceSelection('Replaced', start, end)

                expect(wwEditor).toContainHTML('<p>line1</p><p>Replaced<strong>strong</strong></p>')
            })
        })
    })

    describe('static API', () => {
        it('factory()', () => {
            const editorInst = Editor.factory({ el: document.createElement('div'), viewer: false })
            const viewerInst = Editor.factory({ el: document.createElement('div'), viewer: true })

            expect(editorInst).toBeInstanceOf(Editor)
            expect(viewerInst).toBeInstanceOf(Viewer)
        })

        it('setLanguage()', () => {
            const data = {}

            vi.spyOn(i18n, 'setLanguage')

            Editor.setLanguage('ko', data)

            expect(i18n.setLanguage).toHaveBeenCalledWith('ko', data)
        })
    })

    describe('options', () => {
        beforeEach(() => {
            container = document.createElement('div')

            document.body.appendChild(container)
        })

        afterEach(() => {
            editor.destroy()
            document.body.removeChild(container)
        })

        function createEditor(options: EditorOptions) {
            editor = new Editor(options)

            const elements = editor.getEditorElements()

            mdEditor = elements.mdEditor
            mdPreview = elements.mdPreview!
            wwEditor = elements.wwEditor!
        }

        describe('accessibility', () => {
            it('should expose both editors as labelled multiline textboxes', () => {
                createEditor({ el: container });

                [
                    [mdEditor, 'Markdown'],
                    [wwEditor, 'WYSIWYG']
                ].forEach(([el, label]) => {
                    const editable = (el as HTMLElement).querySelector('[contenteditable]')!

                    expect(editable).toHaveAttribute('role', 'textbox')
                    expect(editable).toHaveAttribute('aria-multiline', 'true')
                    expect(editable).toHaveAttribute('aria-label', label)
                })
            })
        })

        describe('plugins', () => {
            it('should invoke plugin functions', () => {
                const fooPlugin = vi.fn().mockReturnValue({})
                const barPlugin = vi.fn().mockReturnValue({})

                createEditor({ el: container, plugins: [fooPlugin, barPlugin] })

                const { eventEmitter } = editor

                expect(fooPlugin).toHaveBeenCalledWith(expect.objectContaining({ eventEmitter }))
                expect(barPlugin).toHaveBeenCalledWith(expect.objectContaining({ eventEmitter }))
            })

            it('should invoke plugin function with options of plugin', () => {
                const plugin = vi.fn().mockReturnValue({})
                const options = {}

                createEditor({ el: container, plugins: [[plugin, options]] })

                const { eventEmitter } = editor

                expect(plugin).toHaveBeenCalledWith(
                    expect.objectContaining({ eventEmitter }),
                    expect.objectContaining(options)
                )
            })

            it('should add command to command manager when plugin return \'markdownCommands\' value', () => {
                const spy = vi.fn()
                const plugin = () => ({
                    markdownCommands: {
                        foo: () => {
                            spy()
                            return true
                        }
                    }
                })

                createEditor({ el: container, plugins: [plugin] })

                editor.exec('foo')

                expect(spy).toHaveBeenCalled()
            })

            it('should add command to command manager when plugin return \'wysiwygCommands\' value', () => {
                const spy = vi.fn()
                const plugin = () => ({
                    wysiwygCommands: {
                        foo: () => {
                            spy()
                            return true
                        }
                    }
                })

                createEditor({ el: container, plugins: [plugin] })

                editor.changeMode('wysiwyg')
                editor.exec('foo')

                expect(spy).toHaveBeenCalled()
            })

            it('should add toolbar item when plugin return \'toolbarItems\' value', () => {
                const toolbarItem = {
                    name: 'color',
                    tooltip: 'Text color',
                    className: 'uf-toolbar-icons color'
                }
                const plugin = () => ({
                    toolbarItems: [{ groupIndex: 1, itemIndex: 2, item: toolbarItem }]
                })

                createEditor({ el: container, plugins: [plugin] })

                const toolbar = document.querySelector(`.${cls('toolbar-icons.color')}`)

                expect(toolbar).toBeInTheDocument()
            })
        })

        describe('autofocus', () => {
            it('should focus the editor once it is mounted', async () => {
                createEditor({ el: container })

                expect(mdEditor).not.toContainElement(document.activeElement as HTMLElement)

                await Promise.resolve()

                expect(mdEditor).toContainElement(document.activeElement as HTMLElement)
            })

            it('should not focus the editor with autofocus: false', async () => {
                createEditor({ el: container, autofocus: false })

                await Promise.resolve()

                expect(mdEditor).not.toContainElement(document.activeElement as HTMLElement)
            })

            // the deferred focus would throw on a destroyed editor, which fails the test
            it('should not focus an editor destroyed before it is mounted', async () => {
                createEditor({ el: container })
                editor.destroy()
                await Promise.resolve()

                // for afterEach, which destroys the editor
                createEditor({ el: container, autofocus: false })
            })
        })

        describe('hideModeSwitch', () => {
            it('should hide mode switch if the option value is true', () => {
                createEditor({ el: container, hideModeSwitch: true })

                const modeSwitch = document.querySelector(`.${cls('mode-switch')}`)

                expect(modeSwitch).not.toBeInTheDocument()
            })
        })

        describe('initialValue option', () => {
            it('should not undo the initial value in markdown mode', () => {
                createEditor({ el: container, initialValue: 'initial', initialEditType: 'markdown' })

                editor.exec('undo')

                expect(editor.getMarkdown()).toBe('initial')

                editor.insertText(' text')
                editor.exec('undo')

                expect(editor.getMarkdown()).toBe('initial')
            })

            it('should not undo the initial value in wysiwyg mode', () => {
                createEditor({ el: container, initialValue: 'initial', initialEditType: 'wysiwyg' })

                editor.exec('undo')

                expect(editor.getMarkdown()).toBe('initial')
            })

            it('should undo setMarkdown()', () => {
                createEditor({ el: container, initialValue: 'initial', initialEditType: 'markdown' })

                editor.setMarkdown('changed')
                editor.exec('undo')

                expect(editor.getMarkdown()).toBe('initial')
            })
        })

        describe('initialEditType', () => {
            it('should render the markdown editor if the option value is null', () => {
                // @ts-expect-error testing an invalid option value
                createEditor({ el: container, initialEditType: null })

                expect(editor.isMarkdownMode()).toBe(true)
                expect(document.querySelector(`.${cls('main')}`)).toHaveClass(cls('md-mode'))
            })
        })

        describe('keydown event', () => {
            function pressEnter(el: HTMLElement) {
                const ev = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    keyCode: 13,
                    bubbles: true,
                    cancelable: true
                })

                el.querySelector('[contenteditable=true]')!.dispatchEvent(ev)
            }

            ['markdown', 'wysiwyg'].forEach((type) => {
                it(`should not handle the key in ${type} mode when a listener prevents the default`, () => {
                    createEditor({
                        el: container,
                        initialValue: 'foo',
                        initialEditType: type as EditorType,
                        events: { keydown: (_: string, ev: KeyboardEvent) => ev.preventDefault() }
                    })

                    pressEnter(type === 'markdown' ? mdEditor : wwEditor)

                    expect(editor.getMarkdown()).toBe('foo')
                })

                it(`should handle the key in ${type} mode when no listener prevents the default`, () => {
                    createEditor({ el: container, initialValue: 'foo', initialEditType: type as EditorType })

                    pressEnter(type === 'markdown' ? mdEditor : wwEditor)

                    expect(editor.getMarkdown()).not.toBe('foo')
                })
            })
        })

        describe('extendedAutolinks option', () => {
            it('should convert url-like strings to anchor tags', () => {
                createEditor({
                    el: container,
                    initialValue: 'http://example.com',
                    extendedAutolinks: true,
                    previewHighlight: false
                })

                expect(getPreviewHTML()).toBe('<p><a href="http://example.com">http://example.com</a></p>')
            })
        })

        describe('headings in lists and block quotes', () => {
            it('should parse a setext heading in a list item', () => {
                createEditor({
                    el: container,
                    initialValue: '- item1\n\t-',
                    previewHighlight: false
                })

                const result = oneLineTrim`
          <ul>
            <li>
              <h2>item1</h2>
            </li>
          </ul>
        `

                expect(getPreviewHTML()).toBe(result)
            })

            it('should parse an ATX heading in a list item', () => {
                createEditor({
                    el: container,
                    initialValue: '- # item1',
                    previewHighlight: false
                })

                const result = oneLineTrim`
          <ul>
            <li>
              <h1>item1</h1>
            </li>
          </ul>
        `

                expect(getPreviewHTML()).toBe(result)
            })

            it('should parse a setext heading in a block quote', () => {
                createEditor({
                    el: container,
                    initialValue: '> item1\n> -',
                    previewHighlight: false
                })

                const result = oneLineTrim`
          <blockquote>
            <h2>item1</h2>
          </blockquote>
        `

                expect(getPreviewHTML()).toBe(result)
            })

            it('should parse an ATX heading in a block quote', () => {
                createEditor({
                    el: container,
                    initialValue: '> # item1',
                    previewHighlight: false
                })

                const result = oneLineTrim`
          <blockquote>
            <h1>item1</h1>
          </blockquote>
        `

                expect(getPreviewHTML()).toBe(result)
            })
        })

        describe('frontMatter option', () => {
            it('should parse the front matter as the paragraph in WYSIWYG', () => {
                createEditor({
                    el: container,
                    frontMatter: true,
                    initialValue: '---\ntitle: front matter\n---',
                    initialEditType: 'wysiwyg'
                })

                const result = stripIndents`
          <div data-front-matter="true">---
          title: front matter
          ---</div>
        `

                expect(wwEditor).toContainHTML(result)
            })

            it('should keep the front matter after changing the mode', () => {
                createEditor({
                    el: container,
                    frontMatter: true,
                    initialEditType: 'wysiwyg',
                    initialValue: '---\ntitle: front matter\n---'
                })

                editor.changeMode('markdown')

                expect(editor.getMarkdown()).toBe('---\ntitle: front matter\n---')
            })
        })

        describe('customHTMLSanitizer option', () => {
            it('should replace default sanitizer with custom sanitizer', () => {
                const customHTMLSanitizer = vi.fn()

                createEditor({ el: container, customHTMLSanitizer })

                editor.changeMode('wysiwyg')

                expect(customHTMLSanitizer).toHaveBeenCalled()
            })
        })

        describe('customHTMLRenderer', () => {
            it('should pass customHTMLRender option for creating convertor instance', () => {
                createEditor({
                    el: container,
                    initialValue: 'Hello World',
                    previewHighlight: false,
                    customHTMLRenderer: {
                        paragraph: (_, { entering, origin }) => {
                            const result = origin!() as OpenTagToken

                            if (entering) {
                                result.classNames = ['my-class']
                            }

                            return result
                        }
                    }
                })

                expect(getPreviewHTML()).toBe('<p class="my-class">Hello World</p>')
            })

            it('linkAttributes option should be applied to original renderer', () => {
                createEditor({
                    el: container,
                    initialValue: '[Hello](example.com)',
                    linkAttributes: { target: '_blank' },
                    previewHighlight: false,
                    customHTMLRenderer: {
                        link: (_, { origin }) => origin!()
                    }
                })

                expect(getPreviewHTML()).toBe('<p><a href="example.com" target="_blank">Hello</a></p>')
            })

            it('should render html block node regardless of the sanitizer', () => {
                createEditor({
                    el: container,
                    initialValue:
            '<iframe width="420" height="315" src="https://www.youtube.com/embed/XyenY12fzAk"></iframe>\n\ntest',
                    previewHighlight: false,
                    // add iframe html block renderer
                    customHTMLRenderer: createHTMLrenderer()
                })

                const result = oneLineTrim`
          <iframe width="420" height="315" src="https://www.youtube.com/embed/XyenY12fzAk"></iframe>
          <p>test</p>
        `

                expect(getPreviewHTML()).toBe(result)
            })

            it('should keep the html block node after changing the mode', () => {
                createEditor({
                    el: container,
                    initialValue:
            '<iframe width="420" height="315" src="https://www.youtube.com/embed/XyenY12fzAk"></iframe>\n\ntest',
                    previewHighlight: false,
                    // add iframe html block renderer
                    customHTMLRenderer: createHTMLrenderer()
                })

                editor.changeMode('wysiwyg')

                const result = oneLineTrim`
          <iframe width="420" height="315" src="https://www.youtube.com/embed/XyenY12fzAk" class="html-block"></iframe>
          <p>test</p>
        `

                expect(wwEditor.innerHTML).toContain(result)
            })

            it('should keep the html attributes with an empty string after changing the mode', () => {
                createEditor({
                    el: container,
                    initialValue: '<iframe width="" height="" src=""></iframe>',
                    previewHighlight: false,
                    // add iframe html block renderer
                    customHTMLRenderer: createHTMLrenderer()
                })

                editor.changeMode('wysiwyg')

                const result = oneLineTrim`
          <iframe width="" height="" src="" class="html-block"></iframe>
        `

                expect(wwEditor.innerHTML).toContain(result)
            })
        })

        describe('hooks option', () => {
            const defaultImageBlobHookSpy = vi.fn()

            function mockDefaultImageBlobHook() {
                defaultImageBlobHookSpy.mockReset()

                vi
                    .spyOn(imageHelper, 'addDefaultImageBlobHook')
                    .mockImplementation((emitter: Emitter) => {
                        emitter.listen('addImageBlobHook', defaultImageBlobHookSpy)
                    })
            }

            it('should remove default `addImageBlobHook` event handler after registering hook', () => {
                const spy = vi.fn()

                mockDefaultImageBlobHook()

                createEditor({
                    el: container,
                    hooks: {
                        addImageBlobHook: spy
                    }
                })

                editor.eventEmitter.emit('addImageBlobHook')

                expect(spy).toHaveBeenCalled()
                expect(defaultImageBlobHookSpy).not.toHaveBeenCalled()
            })
        })
    })
})
