import { Editor } from '../editor'
import { Viewer } from '../viewer'
import { cls } from '../utils/dom'

const markdown = '# כותרת\n\nשלום world\n\n- פריט\n\n> quote\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n```\nconst a = 1;\n```'

describe('autoDirection', () => {
    let el: HTMLElement
    let editor: Editor

    const container = (name: string) => el.querySelector<HTMLElement>(`.${cls(name)}`)!
    const auto = (root: HTMLElement) => Array.from(root.querySelectorAll('[dir="auto"]')).map((node) => node.nodeName)

    function create(autoDirection?: boolean) {
        el = document.createElement('div')
        document.body.appendChild(el)
        editor = new Editor({ el, initialEditType: 'markdown', previewStyle: 'vertical', initialValue: markdown, autoDirection })
    }

    afterEach(() => {
        editor.destroy()
        el.remove()
    })

    it('should give the blocks the direction of their own text, but not code', () => {
        create(true)

        // the markdown's lines, without the code block's three
        const lines = container('md-container').querySelectorAll('.ProseMirror > div')

        expect(auto(container('md-container').querySelector('.ProseMirror')!)).toHaveLength(lines.length - 3)
        expect(container('md-container').querySelector('.uf-md-code-block-line-background')).not.toHaveAttribute('dir')

        // the outer blocks, whose blocks inside take their direction
        expect(auto(container('md-preview'))).toEqual(['H1', 'P', 'UL', 'BLOCKQUOTE', 'TABLE'])
        expect(container('md-preview').querySelector('pre')).not.toHaveAttribute('dir')

        editor.changeMode('wysiwyg')
        expect(auto(container('ww-container'))).toEqual(['H1', 'P', 'UL', 'BLOCKQUOTE', 'TABLE'])
        expect(container('ww-container').querySelector('pre')).not.toHaveAttribute('dir')
    })

    it('should leave the HTML and the markdown as they are', () => {
        create(true)

        expect(editor.getHTML()).not.toContain('dir=')
        expect(editor.getMarkdown()).toBe(markdown)
    })

    it('should be off by default', () => {
        create()

        expect(el.querySelector('[dir]')).toBeNull()
    })
})

describe('autoDirection in the viewer', () => {
    it('should give the viewer\'s blocks the direction of their own text', () => {
        const el = document.createElement('div')
        const viewer = new Viewer({ el, initialValue: 'שלום\n\n- a', autoDirection: true })

        expect(Array.from(el.querySelectorAll('[dir="auto"]')).map((node) => node.nodeName)).toEqual(['P', 'UL'])
        viewer.destroy()
    })
})
