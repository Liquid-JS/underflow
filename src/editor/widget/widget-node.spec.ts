import { DOMParser } from 'prosemirror-model'
import { EditorCore } from '../editor-core'
import { WidgetContext, WidgetClickEvent } from '../types/editor'
import { cls } from '../utils/dom'
import { removeDataAttr } from '../../../test/markdown'

const reLink = /\[(#\S+)\]\((\S+)\)/

describe('widgets', () => {
    let container: HTMLElement
    let mdEditor: HTMLElement
    let mdPreview: HTMLElement
    let wwEditor: HTMLElement
    let editor: EditorCore
    let contexts: WidgetContext[]

    function getPreviewHTML() {
        return removeDataAttr(mdPreview.querySelector(`.${cls('contents')}`)!.innerHTML)
    }

    // the text of each widget in the markdown editor, whose parts can be separate elements
    function getSourceWidgets() {
        const texts: string[] = []

        mdEditor.querySelectorAll(`.${cls('md-widget')}`).forEach((el) => {
            const prev = el.previousSibling as HTMLElement | null

            if (prev?.classList?.contains(cls('md-widget'))) {
                texts[texts.length - 1] += el.textContent
            } else {
                texts.push(el.textContent!)
            }
        })

        return texts
    }

    beforeEach(() => {
        contexts = []
        container = document.createElement('div')
        editor = new EditorCore({
            el: container,
            cursorLineHighlight: false,
            previewHighlight: false,
            widgetRules: [
                {
                    rule: /@\w+/,
                    toDOM: (text, context) => {
                        const span = document.createElement('span')

                        contexts.push(context)
                        span.innerHTML = `<a href="www.google.com">${text}</a>`

                        return span
                    }
                },
                {
                    rule: reLink,
                    toDOM: (text) => {
                        const [, label, url] = text.match(reLink)!
                        const span = document.createElement('span')

                        span.innerHTML = `<a href="${url}">${label}</a>`

                        return span
                    },
                    // show the label, hide the URL while the cursor is outside
                    toSource: (text) => {
                        const [, label] = text.match(reLink)!

                        return [
                            { from: 1, to: 1 + label.length, className: 'label' },
                            { from: label.length + 2, to: text.length, collapsed: true }
                        ]
                    }
                }
            ],
            previewStyle: 'vertical'
        })

        const elements = editor.getEditorElements()

        mdEditor = elements.mdEditor
        mdPreview = elements.mdPreview!
        wwEditor = elements.wwEditor!

        container.append(mdEditor, mdPreview, wwEditor)
        document.body.appendChild(container)
    })

    afterEach(() => {
        editor.destroy()
        document.body.removeChild(container)
    })

    describe('in markdown', () => {
        it('should keep the text in the editor and show the widget in the preview', () => {
            editor.setMarkdown('hi @test')

            expect(getSourceWidgets()).toEqual(['@test'])
            expect(getPreviewHTML()).toBe(
                '<p>hi <span class="uf-widget" data-widget="widget0" data-widget-text="@test">' +
          '<span><a href="www.google.com">@test</a></span></span></p>'
            )
            expect(contexts).toEqual([{ interactive: false }])
            expect(editor.getMarkdown()).toBe('hi @test')
        })

        it('should apply the rules to text inserted through the API', () => {
            editor.setMarkdown('abc')
            editor.replaceWithWidget([1, 1], [1, 4], '@one')
            editor.insertText(' @two')
            editor.replaceSelection(' @three')

            expect(getSourceWidgets()).toEqual(['@one', '@two', '@three'])
            expect(editor.getMarkdown()).toBe('@one @two @three')
        })

        it('should match markdown syntax, with the first rule that matches earliest', () => {
            editor.setMarkdown('see [#example](https://docs.example.com) and @test')

            expect(getSourceWidgets()).toEqual(['[#example](https://docs.example.com)', '@test'])
            expect(getPreviewHTML()).toContain('<a href="https://docs.example.com">#example</a>')
        })

        it('should not apply the rules in code', () => {
            editor.setMarkdown('`@test`\n\n```\n@test\n```')

            expect(getSourceWidgets()).toEqual([])
            expect(getPreviewHTML()).not.toContain('uf-widget')
        })

        it('should keep "$$" as text', () => {
            editor.setMarkdown('@test $$myText @test2')

            expect(getPreviewHTML()).toContain('</span> $$myText <span')
            expect(editor.getMarkdown()).toBe('@test $$myText @test2')
        })

        it('should style the text with toSource() and show collapsed parts while the cursor is in the widget', () => {
            editor.setMarkdown('[#example](https://docs.example.com) end')
            editor.setSelection([1, 41], [1, 41])

            const collapsed = () => mdEditor.querySelector(`.${cls('md-widget-collapsed')}`)?.textContent

            expect(mdEditor.querySelector('.label')).toHaveTextContent('#example')
            expect(collapsed()).toBe('(https://docs.example.com)')

            editor.setSelection([1, 4], [1, 4])

            expect(collapsed()).toBeUndefined()
        })

        it('should emit clickWidget with the text and its position', () => {
            const clicks: WidgetClickEvent[] = []

            editor.on('clickWidget', (event: WidgetClickEvent) => clicks.push(event))
            editor.setMarkdown('hi @test')

            // @ts-expect-error accessing the markdown editor's view for testing
            const { view } = editor.mdEditor

            view.someProp('handleClick', (fn: any) => fn(view, 6, new MouseEvent('click')))

            expect(clicks).toMatchObject([{ text: '@test', start: [1, 4], end: [1, 9] }])
        })
    })

    describe('in wysiwyg', () => {
        it('should show interactive widgets and write their text to markdown', () => {
            editor.setMarkdown('hi @test and [#example](https://docs.example.com)')
            editor.changeMode('wysiwyg')

            const widget = wwEditor.querySelector('.uf-widget') as HTMLElement

            expect(widget).toContainHTML('<a href="www.google.com">@test</a>')
            expect(widget.contentEditable).toBe('false')
            expect(contexts).toContainEqual({ interactive: true })
            expect(editor.getMarkdown()).toBe('hi @test and [#example](https://docs.example.com)')
        })

        it('should apply the rules to text inserted through the API', () => {
            editor.changeMode('wysiwyg')
            editor.replaceWithWidget(1, 1, '@one')
            editor.insertText(' @two')
            editor.replaceSelection(' @three')

            expect(wwEditor.querySelectorAll('.uf-widget')).toHaveLength(3)
            expect(editor.getMarkdown()).toBe('@one @two @three')
        })

        it('should turn typed text into a widget', () => {
            editor.changeMode('wysiwyg')

            // @ts-expect-error accessing the WYSIWYG editor's view for testing
            const { view } = editor.wwEditor

            const type = (text: string) => {
                const { from, to } = view.state.selection

                if (!view.someProp('handleTextInput', (fn: any) => fn(view, from, to, text))) {
                    view.dispatch(view.state.tr.insertText(text, from, to))
                }
            }

            // a widget is created once the next character doesn't extend the match
            '@test'.split('').forEach(type)

            expect(wwEditor.querySelector('.uf-widget')).toBeNull()

            type(' ')

            const paragraph = view.state.doc.firstChild!

            expect(paragraph.firstChild!.attrs).toEqual({ info: 'widget0', text: '@test' })
            expect(paragraph.lastChild!.text).toBe(' ')
            expect(editor.getMarkdown()).toBe('@test ')
        })

        it('should give getHTML() the widgets as they render, which parse back into widgets', () => {
            editor.setMarkdown('hi @test')
            editor.changeMode('wysiwyg')
            contexts = []

            const html = editor.getHTML()

            expect(html).toBe(
                '<p>hi <span class="uf-widget" data-widget="widget0" data-widget-text="@test">' +
          '<span><a href="www.google.com">@test</a></span></span></p>'
            )
            expect(contexts).toEqual([{ interactive: false }])

            // @ts-expect-error accessing the WYSIWYG editor's view for testing
            const { schema } = editor.wwEditor.view.state
            const wrapper = document.createElement('div')

            wrapper.innerHTML = html

            const doc = DOMParser.fromSchema(schema).parse(wrapper)

            expect(doc.firstChild!.lastChild!.attrs).toEqual({ info: 'widget0', text: '@test' })
            expect(doc.textContent).toBe('hi @test')
        })
    })
})
