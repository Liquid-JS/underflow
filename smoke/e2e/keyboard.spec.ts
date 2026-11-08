import { expect, test } from '@playwright/test'

// Safari's Tab skips buttons without a tabindex, which WebKit runs into here too
test('the editor works by keyboard', async ({ page }) => {
    await page.goto('/')

    const editor = page.locator('#editor')
    const text = editor.locator('.uf-ww-container [contenteditable="true"]')

    await text.click()

    // Escape and Shift+Tab leave the text for the toolbar, Tab returns to the text
    await page.keyboard.press('Escape')
    await page.keyboard.press('Shift+Tab')
    await expect(editor.locator('.uf-toolbar button:focus')).toHaveCount(1)

    await page.keyboard.press('Tab')
    await expect(text).toBeFocused()

    // Escape and Tab leave the text for the code block's language button, then the mode switch,
    // whose arrow keys change the mode
    await page.keyboard.press('Escape')
    await page.keyboard.press('Tab')
    await expect(editor.locator('.uf-code-block-label')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(editor.locator('.uf-mode-switch [role="tab"][aria-selected="true"]')).toBeFocused()

    await page.keyboard.press('ArrowLeft')
    await expect(editor.locator('.uf-main')).toHaveClass(/uf-md-mode/)
    await expect(editor.locator('.uf-mode-switch [role="tab"][aria-selected="true"]')).toBeFocused()

    // the preview, shown by its tab, is a named region that Tab reaches, to scroll it by keyboard
    await editor.locator('.uf-md-tab-container [role="tab"]').nth(1).click()
    await page.keyboard.press('Tab')
    await expect(editor.locator('.uf-md-preview[role="region"]')).toBeFocused()

    // Tab moves through all of a popup's fields and buttons
    await editor.locator('.uf-mode-switch [role="tab"][aria-selected="true"]').focus()
    await page.keyboard.press('ArrowRight')
    await editor.locator('.uf-toolbar-icons.link').focus()
    await page.keyboard.press('Enter')

    const popup = editor.locator('.uf-popup-add-link')

    await expect(popup.locator('input').first()).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(popup.locator('input').nth(1)).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(popup.locator('.uf-close-button')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(popup.locator('.uf-ok-button')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(popup.locator('input').first()).toBeFocused()
})
