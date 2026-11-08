import { EditorView } from 'prosemirror-view'
import { EditorOptions } from './types/editor'
import { Editor } from './editor'
import { cls } from './utils/dom'
import { task } from './wysiwyg/plugins/task'
import { smartTask } from './markdown/plugins/smart-task'
import { MdContext } from './types/spec'

describe('readonly', () => {
    let container: HTMLElement
    let editor: Editor

    const texts = () => {
        const { mdEditor, wwEditor } = editor.getEditorElements()

        return [mdEditor, wwEditor!].map((el) => el.querySelector<HTMLElement>('.ProseMirror')!)
    }
    const query = (selector: string) => container.querySelector<HTMLElement>(selector)!
    const queryAll = (selector: string) => Array.from(container.querySelectorAll<HTMLElement>(selector))
    const modeTabs = () => queryAll(`.${cls('mode-switch')} [role="tab"]`)
    const writeTabs = () => queryAll(`.${cls('md-tab-container')} [role="tab"]`)
    const toolbarButtons = () => queryAll(`.${cls('toolbar-group')} button`)

    function create(options: Partial<EditorOptions> = {}) {
        container = document.createElement('div')
        document.body.appendChild(container)
        editor = new Editor({
            el: container,
            initialValue: '# Title\n\n* [ ] task\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n```js\nconst a = 1\n```',
            previewHighlight: false,
            readonly: true,
            ...options
        })
    }

    afterEach(() => {
        editor.destroy()
        document.body.removeChild(container)
    })

    it('should leave the text focusable, but not editable', () => {
        create()

        expect(editor.isReadonly()).toBe(true)
        expect(query(`.${cls('default-ui')}`)).toHaveClass(cls('readonly'))
        texts().forEach((text) => {
            expect(text).toHaveAttribute('contenteditable', 'false')
            expect(text).toHaveAttribute('aria-readonly', 'true')
            expect(text).toHaveAttribute('tabindex', '0')
            expect(text).toHaveAttribute('role', 'textbox')
            expect(text).toHaveClass(cls('readonly'))
        })
    })

    it('should make the text editable again', () => {
        create()
        editor.setReadonly(false)

        expect(editor.isReadonly()).toBe(false)
        expect(query(`.${cls('default-ui')}`)).not.toHaveClass(cls('readonly'))
        texts().forEach((text) => {
            expect(text).toHaveAttribute('contenteditable', 'true')
            expect(text).not.toHaveAttribute('aria-readonly')
            expect(text).not.toHaveAttribute('tabindex')
            expect(text).not.toHaveClass(cls('readonly'))
        })
    })

    it('should still change the text through the API', () => {
        create()
        editor.setMarkdown('changed')
        expect(editor.getMarkdown()).toBe('changed')

        editor.changeMode('wysiwyg', true)
        editor.setMarkdown('again')
        expect(editor.getMarkdown()).toBe('again')
    })

    it('should disable the toolbar and the mode switch, but not the Write and Preview tabs', () => {
        create()

        expect(toolbarButtons().length).toBeGreaterThan(0)
        toolbarButtons().forEach((button) => expect(button).toBeDisabled())
        modeTabs().forEach((tab) => expect(tab).toHaveAttribute('aria-disabled', 'true'))

        modeTabs()[1].click()
        modeTabs()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
        expect(editor.isMarkdownMode()).toBe(true)

        writeTabs()[1].click()
        expect(writeTabs()[1]).toHaveClass('active')
        expect(writeTabs()[1]).not.toHaveAttribute('aria-disabled')
    })

    it('should enable the toolbar and the mode switch again', () => {
        create()
        editor.setReadonly(false)

        expect(query(`.${cls('toolbar-group')} button.bold`)).toBeEnabled()
        modeTabs().forEach((tab) => expect(tab).not.toHaveAttribute('aria-disabled'))

        modeTabs()[1].click()
        expect(editor.isWysiwygMode()).toBe(true)
    })

    it('should close an open popup and open no others', () => {
        create({ readonly: false })
        const popup = () => query(`.${cls('popup')}`)

        editor.eventEmitter.emit('openPopup', 'link')
        expect(popup()).toHaveStyle({ display: 'block' })

        editor.setReadonly(true)
        expect(popup()).toHaveStyle({ display: 'none' })

        editor.eventEmitter.emit('openPopup', 'link')
        expect(popup()).toHaveStyle({ display: 'none' })
    })

    it('should copy instead of cutting, and not paste, in the markdown editor', () => {
        create()
        const [text] = texts()
        const setData = vi.fn()

        editor.setSelection([1, 1], [1, 8])

        const cut = new Event('cut', { bubbles: true, cancelable: true })

        Object.defineProperty(cut, 'clipboardData', { value: { setData } })
        text.dispatchEvent(cut)
        expect(setData).toHaveBeenCalledWith('text/plain', '# Title')

        const paste = new Event('paste', { bubbles: true, cancelable: true })

        Object.defineProperty(paste, 'clipboardData', {
            value: { items: [], getData: () => 'pasted' }
        })
        text.dispatchEvent(paste)

        expect(editor.getMarkdown()).toMatch(/^# Title\n/)
        expect(editor.getMarkdown()).not.toContain('pasted')
    })

    it('should not open the table menu or the code block language editor in WYSIWYG', () => {
        create({ initialEditType: 'wysiwyg' })
        const [, text] = texts()
        const menus = vi.fn()

        editor.eventEmitter.listen('contextmenu', menus)
        text.querySelector('td')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
        expect(menus).not.toHaveBeenCalled()

        query(`.${cls('code-block-label')}`).click()
        expect(document.querySelector('.uf-ww-code-block-language')).toBeNull()
    })
})

describe('readonly task plugins', () => {
    it('should not toggle tasks by clicking or typing', () => {
        const view = { editable: false } as EditorView
        const ev = new MouseEvent('mousedown')
        const mdContext = {} as MdContext

        expect(task().props.handleDOMEvents!.mousedown!.call(null as never, view, ev)).toBe(false)
        expect(
            smartTask(mdContext).props.handleDOMEvents!.keyup!.call(
                null as never,
                { ...view, state: { selection: { empty: true } } } as unknown as EditorView,
                new KeyboardEvent('keyup', { key: 'x' })
            )
        ).toBe(false)
    })
})
