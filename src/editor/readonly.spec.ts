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

describe('disabled', () => {
    let container: HTMLElement
    let editor: Editor

    const texts = () => {
        const { mdEditor, wwEditor } = editor.getEditorElements()

        return [mdEditor, wwEditor].map((el) => el.querySelector<HTMLElement>('.ProseMirror')!)
    }
    const queryAll = (selector: string) => Array.from(container.querySelectorAll<HTMLElement>(selector))
    const tabs = (bar: string) => queryAll(`.${cls(bar)} [role="tab"]`)
    const preview = () => editor.getEditorElements().mdPreview

    function create(options: Partial<EditorOptions> = {}) {
        container = document.createElement('div')
        document.body.appendChild(container)
        editor = new Editor({
            el: container,
            initialValue: '# Title',
            previewHighlight: false,
            disabled: true,
            ...options
        })
    }

    afterEach(() => {
        editor.destroy()
        document.body.removeChild(container)
    })

    it('should make the editor read-only, and take all of it out of the Tab order', () => {
        create()

        expect(editor.isDisabled()).toBe(true)
        expect(container.querySelector(`.${cls('default-ui')}`)).toHaveClass(cls('disabled'), cls('readonly'))
        texts().forEach((text) => {
            expect(text).toHaveAttribute('contenteditable', 'false')
            expect(text).toHaveAttribute('aria-disabled', 'true')
            expect(text).toHaveAttribute('tabindex', '-1')
            expect(text).not.toHaveAttribute('aria-readonly')
            expect(text).toHaveClass(cls('disabled'))
        })
        queryAll(`.${cls('toolbar-group')} button`).forEach((button) => expect(button).toBeDisabled())
        expect(preview()).toHaveAttribute('tabindex', '-1')
        for (const bar of ['mode-switch', 'md-tab-container']) {
            tabs(bar).forEach((tab) => {
                expect(tab).toHaveAttribute('aria-disabled', 'true')
                expect(tab).toHaveAttribute('tabindex', '-1')
            })
        }

        // the Write and Preview tabs don't switch
        tabs('md-tab-container')[1].click()
        expect(tabs('md-tab-container')[0]).toHaveClass('active')
    })

    it('should enable the editor again', () => {
        create()
        editor.setDisabled(false)

        expect(editor.isDisabled()).toBe(false)
        expect(container.querySelector(`.${cls('default-ui')}`)).not.toHaveClass(cls('disabled'))
        texts().forEach((text) => {
            expect(text).toHaveAttribute('contenteditable', 'true')
            expect(text).not.toHaveAttribute('aria-disabled')
            expect(text).not.toHaveAttribute('tabindex')
        })
        expect(preview()).toHaveAttribute('tabindex', '0')
        for (const bar of ['mode-switch', 'md-tab-container']) {
            expect(tabs(bar)[0]).not.toHaveAttribute('aria-disabled')
            expect(tabs(bar)[0]).toHaveAttribute('tabindex', '0')
        }
    })

    it('should leave a read-only editor read-only when it is enabled', () => {
        create({ readonly: true })
        editor.setDisabled(false)

        expect(editor.isReadonly()).toBe(true)
        texts().forEach((text) => {
            expect(text).toHaveAttribute('contenteditable', 'false')
            expect(text).toHaveAttribute('aria-readonly', 'true')
            expect(text).toHaveAttribute('tabindex', '0')
        })
        expect(tabs('md-tab-container')[0]).not.toHaveAttribute('aria-disabled')
    })

    it('should disable the scroll sync switch, which a read-only editor keeps', () => {
        create({ previewStyle: 'vertical', readonly: true })
        const scrollSync = () => container.querySelector<HTMLInputElement>('.scroll-sync input')!

        expect(scrollSync()).toBeDisabled()

        editor.setDisabled(false)
        expect(scrollSync()).toBeEnabled()
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
