import { fireEvent, screen } from '@testing-library/dom'
import { Emitter } from '../../types/event'
import { cls } from '../../utils/dom'
import { Editor } from '../../../index'

const EDITOR_CLASS = 'uf-editor'

function getElement(selector: string) {
    return document.querySelector<HTMLElement>(selector)!
}

function getEditorMain() {
    return getElement(`.${cls('main')}`)!
}

function getMdEditor() {
    return getElement(`.${cls('md-container')} .${EDITOR_CLASS}`)!
}

function getMdPreview() {
    return getElement(`.${cls('md-container')} .${cls('md-preview')}`)!
}

function getWwEditor() {
    return getElement(`.${cls('ww-container')} .${EDITOR_CLASS}`)!
}

function getMdSwitch() {
    return screen.getByText('Markdown')!
}

function getWwSwitch() {
    return screen.getByText('WYSIWYG')!
}

function clickMdSwitch() {
    return getMdSwitch().click()
}

function clickWwSwitch() {
    return getWwSwitch().click()
}

function getMdWriteTab() {
    return getElement(`.${cls('md-tab-container')} .tab-item`)!
}

function getMdPreviewTab() {
    return document.querySelectorAll<HTMLElement>(`.${cls('md-tab-container')} .tab-item`)[1]
}

function getScrollSyncWrapper() {
    const scrollSync = getElement('.scroll-sync')

    return scrollSync ? scrollSync.parentElement : null
}

function clickMdWriteTab() {
    return getMdWriteTab().click()
}

function clickMdPreviewTab() {
    return getMdPreviewTab().click()
}

function assertToContainElement(el: HTMLElement) {
    expect(document.body).toContainElement(el)
}

describe('layout component', () => {
    let container: HTMLElement
    let editor: Editor
    let em: Emitter

    beforeEach(() => {
        container = document.createElement('div')
        editor = new Editor({
            el: container,
            previewStyle: 'vertical',
            height: '400px',
            initialEditType: 'markdown'
        })
        em = editor.eventEmitter
        document.body.appendChild(container)
    })

    afterEach(() => {
        editor.destroy()
        document.body.removeChild(container)
    })

    it('render default ui properly', () => {
        assertToContainElement(getEditorMain())
        assertToContainElement(getMdEditor())
        assertToContainElement(getMdPreview())
        assertToContainElement(getWwEditor())
        assertToContainElement(getMdSwitch())
        assertToContainElement(getWwSwitch())
    })

    it('show/hide editor', () => {
        const layout = getElement(`.${cls('default-ui')}`)

        editor.hide()
        expect(layout).toHaveClass('hidden')

        editor.show()
        expect(layout).not.toHaveClass('hidden')
    })

    describe('changing editor mode', () => {
        it('should trigger needChangeMode when clicking the switch button', () => {
            const spy = vi.fn()

            em.listen('needChangeMode', spy)

            clickWwSwitch()
            expect(spy).toHaveBeenCalledWith('wysiwyg')

            clickMdSwitch()
            expect(spy).toHaveBeenCalledWith('markdown')
        })

        it('should switch the mode by keyboard', () => {
            const mdSwitch = getMdSwitch()
            const wwSwitch = getWwSwitch()

            expect(mdSwitch).toHaveAttribute('role', 'tab')
            expect(mdSwitch).toHaveAttribute('aria-selected', 'true')
            expect(mdSwitch).toHaveAttribute('tabindex', '0')
            expect(wwSwitch).toHaveAttribute('tabindex', '-1')

            mdSwitch.focus()
            fireEvent.keyDown(mdSwitch, { key: 'ArrowRight' })

            expect(getEditorMain()).toHaveClass(cls('ww-mode'))
            expect(wwSwitch).toHaveAttribute('aria-selected', 'true')
            expect(document.activeElement).toBe(wwSwitch)

            fireEvent.keyDown(wwSwitch, { key: 'ArrowLeft' })

            expect(getEditorMain()).toHaveClass(cls('md-mode'))
            expect(document.activeElement).toBe(mdSwitch)
        })

        it('should switch the editor in layout when changeMode is triggered', () => {
            const editorArea = getEditorMain()
            const mdSwitch = getMdSwitch()
            const wwSwitch = getWwSwitch()

            em.emit('changeMode', 'wysiwyg')

            expect(editorArea).toHaveClass(cls('ww-mode'))
            expect(wwSwitch).toHaveClass('active')
            expect(mdSwitch).not.toHaveClass('active')

            em.emit('changeMode', 'markdown')

            expect(editorArea).toHaveClass(cls('md-mode'))
            expect(mdSwitch).toHaveClass('active')
            expect(wwSwitch).not.toHaveClass('active')
        })

        it('should change layout when clicking the switch button', () => {
            const editorArea = getEditorMain()
            const mdSwitch = getMdSwitch()
            const wwSwitch = getWwSwitch()

            clickWwSwitch()
            expect(editorArea).toHaveClass(cls('ww-mode'))
            expect(wwSwitch).toHaveClass('active')
            expect(mdSwitch).not.toHaveClass('active')

            clickMdSwitch()
            expect(editorArea).toHaveClass(cls('md-mode'))
            expect(mdSwitch).toHaveClass('active')
            expect(wwSwitch).not.toHaveClass('active')
        })

        it('should not render scrollSync when previewStyle is tab regardless of changing editor mode', () => {
            editor = new Editor({
                el: container,
                previewStyle: 'tab'
            })

            const scrollSyncWrapper = getScrollSyncWrapper()

            expect(scrollSyncWrapper).toBeNull()

            em.emit('changeMode', 'wysiwyg')

            expect(scrollSyncWrapper).toBeNull()
        })

        // @todo It needs to break test by each event (changePreviewStyle, changeMode)
        it('should show scrollSync when previewStyle is vertical on only markdown mode', () => {
            const scrollSyncWrapper = getScrollSyncWrapper()

            em.emit('changePreviewStyle', 'vertical')
            expect(scrollSyncWrapper).toHaveStyle({ display: 'inline-block' })

            em.emit('changeMode', 'wysiwyg')
            expect(getElement('.scroll-sync')).toBeNull()
        })

        it('should show scrollSync when previewStyle is changed on only markdown mode', () => {
            em.emit('changeMode', 'wysiwyg')
            em.emit('changePreviewStyle', 'vertical')
            expect(getElement('.scroll-sync')).toBeNull()

            em.emit('changeMode', 'markdown')
            expect(getScrollSyncWrapper()).toHaveStyle({ display: 'inline-block' })
        })
    })

    describe('changing preview style', () => {
        it('should hide markdown tab when changePreviewStyle is triggered', () => {
            const tabSection = getElement(`.${cls('md-tab-container')}`)!

            expect(tabSection).toHaveStyle({ display: 'none' })

            em.emit('changePreviewStyle', 'tab')
            expect(tabSection).toHaveStyle({ display: 'block' })
        })

        it('should hide markdown tab when changeMode is triggered', () => {
            editor = new Editor({
                el: container,
                previewStyle: 'tab',
                initialEditType: 'markdown'
            })
            em = editor.eventEmitter

            const tabSection = getElement(`.${cls('md-tab-container')}`)!

            expect(tabSection).toHaveStyle({ display: 'block' })

            em.emit('changeMode', 'wysiwyg')
            expect(tabSection).toHaveStyle({ display: 'none' })
        })

        it('should put the markdown tabs after the toolbar, in the order of the focus', () => {
            const toolbar = getElement(`.${cls('default-ui-toolbar')}`)
            const tabSection = getElement(`.${cls('md-tab-container')}`)

            expect(toolbar.nextElementSibling).toBe(tabSection)
        })

        it('should display the markdown editor or preview by clicking markdown tab', () => {
            expect(getMdWriteTab()).toHaveClass('active')
            expect(getMdPreviewTab()).not.toHaveClass('active')

            clickMdPreviewTab()

            expect(getMdWriteTab()).not.toHaveClass('active')
            expect(getMdPreviewTab()).toHaveClass('active')
        })

        it('should emit changePreviewTabWrite, changePreviewTabPreview events by clicking markdown tab', () => {
            const spy1 = vi.fn()
            const spy2 = vi.fn()

            em.listen('changePreviewTabWrite', spy1)
            em.listen('changePreviewTabPreview', spy2)

            clickMdPreviewTab()
            expect(spy2).toHaveBeenCalledTimes(1)

            clickMdWriteTab()
            expect(spy1).toHaveBeenCalledTimes(1)
        })

        it('should enable/disable the toolbar items by clicking markdown tab', () => {
            editor = new Editor({
                el: container,
                previewStyle: 'tab',
                initialEditType: 'markdown'
            })
            const scrollSyncWrapper = getScrollSyncWrapper()

            clickMdPreviewTab()

            expect(scrollSyncWrapper).toBeNull()
            expect(getElement(`.${cls('toolbar-icons')}`)).toBeDisabled()

            clickMdWriteTab()

            expect(scrollSyncWrapper).toBeNull()
            expect(getElement(`.${cls('toolbar-icons')}`)).not.toBeDisabled()
        })

        it('should enable the toolbar items when changeMode is triggered', () => {
            editor = new Editor({
                el: container,
                previewStyle: 'tab',
                initialEditType: 'markdown'
            })
            em = editor.eventEmitter

            clickMdPreviewTab()

            em.emit('changeMode', 'wysiwyg')
            expect(getElement(`.${cls('toolbar-icons')}`)).not.toBeDisabled()

            em.emit('changeMode', 'markdown')
            expect(getElement(`.${cls('toolbar-icons')}`)).not.toBeDisabled()
            expect(getMdWriteTab()).toHaveClass('active')
        })

        it('should enable the toolbar items when changePreviewStyle is triggered', () => {
            clickMdPreviewTab()
            em.emit('changePreviewStyle', 'vertical')
            expect(getElement(`.${cls('toolbar-icons')}`)).not.toBeDisabled()
        })
    })

    describe('context menu', () => {
        it('should be displayed when contextmenu event is triggered', () => {
            const contextMenu = getElement(`.${cls('context-menu')}`)

            expect(contextMenu).toHaveStyle({ display: 'none' })
            em.emit('contextmenu', { pos: { left: 10, top: 10 }, menuGroups: [[{ label: 'test' }]] })
            expect(contextMenu).toHaveStyle({ display: 'block' })
        })

        it('should be moved inside the viewport when it overflows the right or bottom edge', () => {
            const contextMenu = getElement(`.${cls('context-menu')}`)
            const { innerWidth, innerHeight } = window

            vi.spyOn(contextMenu, 'getBoundingClientRect').mockReturnValue({
                right: innerWidth + 50,
                bottom: innerHeight + 50,
                width: 200,
                height: 300
            } as DOMRect)
            vi.spyOn(contextMenu, 'offsetLeft', 'get').mockReturnValue(500)
            vi.spyOn(contextMenu, 'offsetTop', 'get').mockReturnValue(600)

            em.emit('contextmenu', { pos: { left: 500, top: 600 }, menuGroups: [[{ label: 'test' }]] })

            expect(contextMenu).toHaveStyle({ left: '300px', top: '300px' })
        })
    })
})
