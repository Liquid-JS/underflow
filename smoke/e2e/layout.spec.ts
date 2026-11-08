import { expect, Page, test } from '@playwright/test'

interface Box { left: number, right: number, top: number, bottom: number }

/** How far `inner`'s inline end is from `outer`'s, and whether `a` comes before `b` in the line. */
function inline(rtl: boolean) {
    return {
        endGap: (outer: Box, inner: Box) => (rtl ? inner.left - outer.left : outer.right - inner.right),
        before: (a: Box, b: Box) => (rtl ? a.left >= b.right - 1 : a.right <= b.left + 1)
    }
}

const boxes = (page: Page, selectors: Record<string, string>) =>
    page.locator('#editor').evaluate((el, query) => {
        const result: Record<string, Box[]> = {}

        for (const [name, selector] of Object.entries(query)) {
            result[name] = [...el.querySelectorAll(selector)]
                .map((node) => node.getBoundingClientRect())
                .filter((box) => box.width > 0)
                .map(({ left, right, top, bottom }) => ({ left, right, top, bottom }))
        }

        return result
    }, selectors)

for (const dir of ['ltr', 'rtl']) {
    const rtl = dir === 'rtl'
    const { endGap, before } = inline(rtl)

    test(`the Write and Preview tabs follow the toolbar, whose disabled buttons are greyed out (${dir})`, async ({ page }) => {
        await page.goto(rtl ? '/?rtl' : '/')

        const editor = page.locator('#editor')

        await editor.locator('.uf-mode-switch [role="tab"]').first().click()
        await expect(editor.locator('.uf-main')).toHaveClass(/uf-md-mode/)

        // at the inline end of the toolbar's row, against the text below; the mode switch at the end of its bar
        const {
            toolbar: [toolbar],
            buttons: [buttons],
            tabs: [tabs],
            modeSwitch: [modeSwitch],
            modeTabs
        } = await boxes(page, {
            toolbar: '.uf-toolbar',
            buttons: '.uf-default-ui-toolbar',
            tabs: '.uf-md-tab-container .uf-tabs',
            modeSwitch: '.uf-mode-switch',
            modeTabs: '.uf-mode-switch [role="tab"]'
        })

        expect(before(buttons, tabs)).toBe(true)
        expect(endGap(toolbar, tabs)).toBeLessThan(20)
        expect(Math.abs(tabs.bottom - toolbar.bottom)).toBeLessThanOrEqual(1)
        expect(endGap(modeSwitch, modeTabs[1])).toBeLessThan(20)
        expect(before(modeTabs[0], modeTabs[1])).toBe(true)

        // Shift+Tab from the text reaches the tabs, then the toolbar
        await editor.locator('.uf-md-container [contenteditable="true"]').click()
        await page.keyboard.press('Escape')
        await page.keyboard.press('Shift+Tab')
        await expect(editor.locator('.uf-md-tab-container [role="tab"][aria-selected="true"]')).toBeFocused()
        await page.keyboard.press('Shift+Tab')
        await expect(editor.locator('.uf-toolbar button:focus')).toHaveCount(1)

        // the icons have the icon colour, and the disabled colour in the preview
        const color = (variable: string) =>
            editor.evaluate((el, name) => {
                const probe = document.createElement('span')

                probe.style.color = `var(${name})`
                el.append(probe)
                const value = getComputedStyle(probe).color

                probe.remove()
                return value
            }, variable)
        const bold = editor.locator('.uf-toolbar-icons.bold')

        await expect(bold).toHaveCSS('color', await color('--uf-icon-color'))
        await editor.locator('.uf-md-tab-container [role="tab"]').nth(1).click()
        await expect(bold).toBeDisabled()
        await expect(bold).toHaveCSS('color', await color('--uf-disabled-text-color'))
    })

    test(`a wrapping toolbar spans the editor, with the tabs at the end of its last row (${dir})`, async ({ page }) => {
        for (const width of [1000, 600, 420]) {
            await page.setViewportSize({ width, height: 800 })
            await page.goto(rtl ? '/?wrap&rtl' : '/?wrap')

            const editor = page.locator('#editor')

            await editor.locator('.uf-mode-switch [role="tab"]').first().click()
            await expect(editor.locator('.uf-toolbar')).toHaveClass(/with-tabs/)

            const {
                toolbar: [toolbar],
                rows: [rows],
                tabs: [tabs],
                buttons
            } = await boxes(page, {
                toolbar: '.uf-toolbar',
                rows: '.uf-default-ui-toolbar',
                tabs: '.uf-md-tab-container .uf-tabs',
                buttons: '.uf-default-ui-toolbar button'
            })
            const layout = {
                overlaps: buttons.filter(
                    (b) => b.right > tabs.left && b.left < tabs.right && b.bottom > tabs.top && b.top < tabs.bottom
                ).length,
                // the buttons' rows are as wide as the toolbar, not only the space beside the tabs
                spans: Math.abs(rows.left - toolbar.left) <= 1 && Math.abs(rows.right - toolbar.right) <= 1,
                tabsAtEnd: endGap(toolbar, tabs) < 20,
                tabsAtBottom: Math.abs(tabs.bottom - toolbar.bottom) <= 1
            }

            expect(layout, `at ${width}px`).toEqual({ overlaps: 0, spans: true, tabsAtEnd: true, tabsAtBottom: true })
            if (width === 420) {
                expect(new Set(buttons.map((b) => Math.round(b.top))).size).toBeGreaterThan(1)
            }
        }
    })
}
