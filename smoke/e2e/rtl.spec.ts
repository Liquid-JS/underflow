import { expect, Locator, test } from '@playwright/test'

/** The left and right edges of some text, and the left edges of its first and last characters. */
interface Span { left: number, right: number, first: number, last: number }

/** Where the first and last characters of `text`, which can span several text nodes, are on the screen. */
const span = (root: Locator, text: string) =>
    root.evaluate((el, search): Span => {
        const nodes: Text[] = []
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)

        while (walker.nextNode()) {
            nodes.push(walker.currentNode as Text)
        }

        const all = nodes.map((node) => node.data).join('')
        const start = all.indexOf(search)

        if (start < 0) {
            throw new Error(`"${search}" isn't in "${all}"`)
        }

        const charBox = (index: number) => {
            let offset = index

            for (const node of nodes) {
                if (offset < node.length) {
                    const range = document.createRange()

                    range.setStart(node, offset)
                    range.setEnd(node, offset + 1)

                    return range.getBoundingClientRect()
                }
                offset -= node.length
            }
            throw new Error(`no character at ${index}`)
        }
        const first = charBox(start)
        const last = charBox(start + search.length - 1)

        return {
            left: Math.min(first.left, last.left),
            right: Math.max(first.right, last.right),
            first: first.left,
            last: last.left
        }
    }, text)

test('code reads left to right in right-to-left text, inline code keeps its place, and tasks check (rtl)', async ({ page }) => {
    await page.goto('/?rtl')

    const editor = page.locator('#editor')
    const modeTabs = editor.locator('.uf-mode-switch [role="tab"]')

    await modeTabs.first().click()
    const markdown = editor.locator('.uf-md-container .ProseMirror')

    await page.evaluate(() => (window as unknown as { smokeEditor: { setMarkdown(markdown: string): void } })
        .smokeEditor.setMarkdown('שלום `inline();` code\n\n```\nconst a = 1;\n```\n\n* [ ] משימה'))

    const check = async (root: Locator) => {
        // the code block's line, with the semicolon at its end, on the right
        const code = await span(root, 'const a = 1;')

        expect(code.last).toBeGreaterThan(code.first)

        // in the right-to-left paragraph the text after the inline code comes to its left
        const inline = await span(root, 'inline();')
        const after = await span(root, ' code')

        expect(inline.last).toBeGreaterThan(inline.first)
        expect(after.right).toBeLessThanOrEqual(inline.left + 1)
    }

    await check(markdown)

    await editor.locator('.uf-md-tab-container [role="tab"]').nth(1).click()
    await check(editor.locator('.uf-md-preview'))

    await modeTabs.nth(1).click()
    await check(editor.locator('.uf-ww-container .ProseMirror'))

    // the task's checkbox is at the start of its line, on the right
    const task = editor.locator('.uf-ww-container .task-list-item')
    const box = (await task.boundingBox())!

    await page.mouse.click(box.x + box.width - 9, box.y + 10)
    await expect(task).toHaveClass(/checked/)
})
