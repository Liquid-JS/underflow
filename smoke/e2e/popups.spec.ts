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
