import { Editor } from '../../editor'
import { cls } from '../../utils/dom'

describe('table context menu by keyboard', () => {
    let el: HTMLElement
    let editor: Editor

    const text = () => el.querySelector<HTMLElement>(`.${cls('ww-container')} .ProseMirror`)!
    const menu = () => el.querySelector<HTMLElement>(`.${cls('context-menu')}`)!
    const items = () => Array.from(menu().querySelectorAll<HTMLElement>('[role="menuitem"]'))
    const key = (target: Element, init: KeyboardEventInit) =>
        target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }))

    beforeEach(() => {
        el = document.createElement('div')
        document.body.appendChild(el)
        editor = new Editor({ el, initialEditType: 'wysiwyg', initialValue: '| a | b |\n| - | - |\n| 1 | 2 |' })
    })

    afterEach(() => {
        editor.destroy()
        el.remove()
    })

    it('should open for the cell with the cursor with Shift+F10 or the menu key, focusing its first item', () => {
        // the cursor in the head's first cell, in "a", where rows can't be added or removed
        editor.setSelection(5, 5)

        for (const init of [{ key: 'F10', shiftKey: true }, { key: 'ContextMenu' }]) {
            key(text(), init)
            expect(menu()).toHaveStyle({ display: 'block' })
            expect(document.activeElement).toBe(items()[0])
            expect(items()[0]).toHaveAttribute('aria-disabled', 'true')

            key(menu(), { key: 'Escape' })
            expect(menu()).toHaveStyle({ display: 'none' })
            expect(document.activeElement).toBe(text())
        }
    })

    it('should move between the items with the arrow keys, Home and End, and choose one with Enter', () => {
        // the cursor in the body's first cell, in "1", which a right click puts there
        editor.setSelection(19, 19)
        text().querySelector('td')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
        const [first] = items()
        const last = items().at(-1)!

        expect(document.activeElement).toBe(first)
        key(menu(), { key: 'ArrowUp' })
        expect(document.activeElement).toBe(last)
        key(menu(), { key: 'ArrowDown' })
        expect(document.activeElement).toBe(first)
        key(menu(), { key: 'End' })
        expect(document.activeElement).toBe(last)
        key(menu(), { key: 'Home' })
        expect(document.activeElement).toBe(first)

        // "Add row below"
        key(menu(), { key: 'ArrowDown' })
        key(menu(), { key: 'Enter' })
        expect(menu()).toHaveStyle({ display: 'none' })
        expect(text().querySelectorAll('tbody tr')).toHaveLength(2)
        expect(document.activeElement).toBe(text())
    })

    it('should close with Tab', () => {
        text().querySelector('td')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
        key(menu(), { key: 'Tab' })
        expect(menu()).toHaveStyle({ display: 'none' })
    })
})
