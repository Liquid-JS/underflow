import { expect, test } from '@playwright/test'

for (const dir of ['ltr', 'rtl']) {
    test(`a read-only editor can be read and focused, but not changed (${dir})`, async ({ page }) => {
        await page.goto(dir === 'rtl' ? '/?readonly&rtl' : '/?readonly')

        const editor = page.locator('#editor')
        const text = editor.locator('.uf-ww-container .ProseMirror')
        const before = await text.innerHTML()

        await expect(text).toHaveAttribute('contenteditable', 'false')
        await expect(text).toHaveAttribute('aria-readonly', 'true')

        // focusable, as a read-only field, but typing, deleting and Enter change nothing
        await text.click()
        await expect(text).toBeFocused()
        await page.keyboard.type('typed')
        await page.keyboard.press('Backspace')
        await page.keyboard.press('Enter')
        expect(await text.innerHTML()).toBe(before)

        // the toolbar is disabled, in the disabled colour
        const bold = editor.locator('.uf-toolbar-icons.bold')
        const disabledColor = await editor.evaluate((el) => {
            const probe = document.createElement('span')

            probe.style.color = 'var(--uf-disabled-text-color)'
            el.append(probe)
            const value = getComputedStyle(probe).color

            probe.remove()
            return value
        })

        await expect(bold).toBeDisabled()
        await expect(bold).toHaveCSS('color', disabledColor)

        // no button edits the code block's language, and the mode switch doesn't switch
        await expect(editor.locator('.uf-code-block-label')).toBeHidden()

        const markdownTab = editor.locator('.uf-mode-switch [role="tab"]').first()

        await expect(markdownTab).toHaveAttribute('aria-disabled', 'true')
        // Playwright waits for a tab with aria-disabled to be enabled; a click still reaches it
        await markdownTab.click({ force: true })
        await expect(editor.locator('.uf-main')).toHaveClass(/uf-ww-mode/)
    })
}
