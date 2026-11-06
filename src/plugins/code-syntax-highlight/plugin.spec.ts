import { source } from 'common-tags'

import hljs from 'highlight.js/lib/core'
import yaml from 'highlight.js/lib/languages/yaml'
import codeSyntaxHighlightPlugin from '../code-syntax-highlight'
import { Editor } from '@liquid-js/underflow'

hljs.registerLanguage('yaml', yaml)

describe('codeSyntaxHighlightPlugin', () => {
    let container: HTMLElement
    let mdPreview: HTMLElement
    let wwEditor: HTMLElement
    let editor: Editor

    const initialValue = source`
    \`\`\`yaml
    martin:
      name: Martin D'vloper
      job: Developer
      skill: Elite
    \`\`\`
  `

    function getPreviewHTML() {
        return mdPreview
            .querySelector('.uf-contents')!
            .innerHTML.replace(/\sdata-nodeid="\d+"|\n/g, '')
            .trim()
    }

    function getWwEditorHTML() {
        return wwEditor.firstElementChild!.innerHTML
    }

    beforeEach(() => {
        container = document.createElement('div')
        editor = new Editor({
            el: container,
            previewStyle: 'vertical',
            initialValue,
            plugins: [[codeSyntaxHighlightPlugin, { highlighter: hljs }]]
        })

        const elements = editor.getEditorElements()

        mdPreview = elements.mdPreview!
        wwEditor = elements.wwEditor!

        document.body.appendChild(container)
    })

    afterEach(() => {
        editor.destroy()
        document.body.removeChild(container)
    })

    it('should render highlighted codeblock element in markdown preview', () => {
        const previewHTML = getPreviewHTML()

        expect(previewHTML).toMatchSnapshot()
    })

    it('should render highlighted codeblock element in wysiwyg', () => {
        editor.changeMode('wysiwyg')

        const wwEditorHTML = getWwEditorHTML()

        expect(wwEditorHTML).toMatchSnapshot()
    })

    it('should render codeblock element with no language info in markdown preview', () => {
        const markdown = source`
      \`\`\`
        console.log(123);
      \`\`\`
    `

        editor.setMarkdown(markdown)

        const previewHTML = getPreviewHTML()

        expect(previewHTML).toMatchSnapshot()
    })

    it('should show line numbers in wysiwyg without changing the markdown', () => {
        editor.destroy()
        editor = new Editor({
            el: container,
            initialEditType: 'wysiwyg',
            initialValue,
            plugins: [[codeSyntaxHighlightPlugin, { highlighter: hljs, lineNumbers: { startFrom: 3 } }]]
        })

        const numbers = Array.from(
            editor.getEditorElements().wwEditor!.querySelectorAll('.hljs-ln-n'),
            (el) => el.getAttribute('data-line')
        )

        expect(numbers).toEqual(['3', '4', '5', '6'])
        expect(editor.getMarkdown()).toBe(initialValue)
    })

    it('should keep highlighting and line numbers out of getHTML()', () => {
        editor.destroy()
        editor = new Editor({
            el: container,
            initialEditType: 'wysiwyg',
            initialValue,
            plugins: [[codeSyntaxHighlightPlugin, { highlighter: hljs, lineNumbers: true }]]
        })

        const html = editor.getHTML()

        expect(editor.getEditorElements().wwEditor!.querySelector('.hljs-ln-n')).not.toBeNull()
        expect(html).not.toMatch(/hljs|uf-ww-code-block|contenteditable/)
        expect(html).toContain('martin:')
        expect(html).toMatch(/^<pre[^>]*><code[^>]*>martin:/)
    })
})
