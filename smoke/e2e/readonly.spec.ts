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

for (const dir of ['ltr', 'rtl']) {
    test(`a disabled editor is read-only, greyed out and out of the Tab order (${dir})`, async ({ page }) => {
        await page.goto(dir === 'rtl' ? '/?disabled&rtl' : '/?disabled')

        const editor = page.locator('#editor')

        // something to focus before the editor and after it
        await page.evaluate(() => {
            const mark = (id: string) => Object.assign(document.createElement('div'), { id, tabIndex: 0, textContent: id })
            const el = document.querySelector('#editor')!

            el.before(mark('before'))
            el.after(mark('after'))
        })

        for (const mode of ['wysiwyg', 'markdown']) {
            await page.evaluate((m) => (window as unknown as { smokeEditor: { changeMode(mode: string): void } })
                .smokeEditor.changeMode(m), mode)
            await page.locator('#before').focus()
            await page.keyboard.press('Tab')
            await expect(page.locator('#after'), `Tab in ${mode}`).toBeFocused()
            await page.keyboard.press('Shift+Tab')
            await expect(page.locator('#before'), `Shift+Tab in ${mode}`).toBeFocused()
        }

        // the text can be clicked, but not changed
        const text = editor.locator('.uf-md-container .ProseMirror')
        const markdown = () => page.evaluate(() =>
            (window as unknown as { smokeEditor: { getMarkdown(): string } }).smokeEditor.getMarkdown())
        const before = await markdown()

        await expect(text).toHaveAttribute('aria-disabled', 'true')
        // Playwright waits for text with aria-disabled to be enabled; a click still reaches it
        await text.click({ force: true })
        await page.keyboard.type('typed')
        await page.keyboard.press('Backspace')
        expect(await markdown()).toBe(before)

        // in the disabled colour, the text and the tabs
        const disabledColor = await editor.evaluate((el) => {
            const probe = document.createElement('span')

            probe.style.color = 'var(--uf-disabled-text-color)'
            el.append(probe)
            const value = getComputedStyle(probe).color

            probe.remove()
            return value
        })

        await expect(text.locator('.uf-md-heading').first()).toHaveCSS('color', disabledColor)
        for (const tab of await editor.locator('[role="tab"]').all()) {
            await expect(tab).toHaveCSS('color', disabledColor)
        }
    })
}
