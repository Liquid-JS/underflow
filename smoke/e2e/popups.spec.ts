import { expect, Locator, test } from '@playwright/test'

/** Whether the bottom of an element shows, rather than being cut off. */
const bottomShows = (locator: Locator) =>
    locator.evaluate((el) => {
        const { left, width, bottom } = el.getBoundingClientRect()
        const hit = document.elementFromPoint(left + width / 2, bottom - 4)

        return !!hit && el.contains(hit)
    })

for (const dir of ['ltr', 'rtl']) {
    test(`popups and the table menu show outside an ancestor that clips the editor (${dir})`, async ({ page }) => {
        await page.goto(dir === 'rtl' ? '/?rtl' : '/')

        const editor = page.locator('#editor')

        // a short box that hides what overflows it, in a page that scrolls
        await page.evaluate(() => {
            const el = document.querySelector<HTMLElement>('#editor')!

            el.style.height = '160px'
            el.style.overflow = 'hidden'
            document.body.style.paddingBottom = '2000px'
            ;(window as unknown as { smokeEditor: { setMarkdown(markdown: string): void } })
                .smokeEditor.setMarkdown('| a | b |\n| - | - |\n| 1 | 2 |')
        })

        await editor.locator('.uf-toolbar-icons.link').click()
        const popup = editor.locator('.uf-popup')

        await expect(popup).toBeVisible()
        expect(await bottomShows(popup)).toBe(true)

        // it moves with the editor when the page scrolls
        const gap = async () => {
            const [popupBox, toolbarBox] = await Promise.all([popup.boundingBox(), editor.locator('.uf-toolbar').boundingBox()])

            return Math.round(popupBox!.y - toolbarBox!.y)
        }
        const before = await gap()

        await page.mouse.wheel(0, 40)
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
        // on the next frame, when the browser reports the scroll
        await expect.poll(gap).toBe(before)

        await page.keyboard.press('Escape')
        await expect(popup).toBeHidden()
        await page.evaluate(() => window.scrollTo(0, 0))

        await editor.locator('.uf-ww-container td').first().click({ button: 'right' })
        const menu = editor.locator('.uf-context-menu')

        await expect(menu).toBeVisible()
        expect(await bottomShows(menu)).toBe(true)

        // closed, it's back in the editor; WebKit doesn't always report a click on the page's root element
        await page.locator('#viewer').click()
        await expect(menu).toBeHidden()
        await expect(menu).not.toHaveAttribute('popover')
    })
}

test('the table menu works by keyboard, and opens below the cell or at the pointer', async ({ page }) => {
    await page.goto('/')

    const editor = page.locator('#editor')

    await page.evaluate(() => (window as unknown as { smokeEditor: { setMarkdown(markdown: string): void } })
        .smokeEditor.setMarkdown('| a | b |\n| - | - |\n| 1 | 2 |'))

    const text = editor.locator('.uf-ww-container .ProseMirror')
    const cell = text.locator('td').first()
    const menu = editor.locator('.uf-context-menu')
    const items = menu.locator('[role="menuitem"]')

    // the cursor in the cell, once the editor has it, and the menu from the keyboard, below it
    const selection = () => page.evaluate(() =>
        (window as unknown as { smokeEditor: { getSelection(): unknown } }).smokeEditor.getSelection())
    const before = await selection()

    await cell.click()
    await expect.poll(selection).not.toEqual(before)
    await page.keyboard.press('Shift+F10')
    await expect(menu).toBeVisible()
    await expect(items.first()).toBeFocused()

    const [menuBox, cellBox] = [(await menu.boundingBox())!, (await cell.boundingBox())!]

    expect(Math.abs(menuBox.x - cellBox.x)).toBeLessThan(2)
    expect(Math.abs(menuBox.y - (cellBox.y + cellBox.height))).toBeLessThan(2)

    // "Add row below", and the focus back in the text
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(menu).toBeHidden()
    await expect(text.locator('tbody tr')).toHaveCount(2)
    await expect(text).toBeFocused()

    // with the mouse, just past the pointer; in the cell's middle, away from the table's edit buttons
    const pointer = { x: Math.round(cellBox.width / 2), y: Math.round(cellBox.height / 2) }

    await cell.click({ button: 'right', position: pointer })
    await expect(menu).toBeVisible()

    const pointerMenu = (await menu.boundingBox())!

    expect(Math.abs(pointerMenu.x - (cellBox.x + pointer.x + 2))).toBeLessThan(2)
    expect(Math.abs(pointerMenu.y - (cellBox.y + pointer.y + 2))).toBeLessThan(2)
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()
    await expect(text).toBeFocused()
})
