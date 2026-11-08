import { expect, Page, test } from '@playwright/test'

type Pane = 'editor' | 'preview'

/** The markdown and the preview side by side, with a long text. */
async function setUp(page: Page) {
    await page.setViewportSize({ width: 1200, height: 900 })
    await page.goto('/')
    await page.locator('#editor .uf-mode-switch [role="tab"]').first().click()

    const markdown = Array.from(
        { length: 40 },
        (_, i) => `## Heading ${i}\n\n${'Some text that wraps in the preview. '.repeat(1 + (i % 4))}\n\n- a\n- b`
    ).join('\n\n')

    await page.evaluate((text) => {
        const { smokeEditor } = window as unknown as {
            smokeEditor: { setMarkdown(markdown: string): void, changePreviewStyle(style: string): void }
        }

        smokeEditor.setMarkdown(text)
        smokeEditor.changePreviewStyle('vertical')
    }, markdown)
    // the sync after the preview renders
    await page.waitForTimeout(500)
}

/** Scrolls a pane as the user does, in steps, then records where both panes are each frame for a while. */
const scrollAndWatch = (page: Page, pane: Pane, then?: Pane) =>
    page.evaluate(async ([from, other]) => {
        const panes = {
            editor: document.querySelector<HTMLElement>('#editor .uf-md-container .ProseMirror')!,
            preview: document.querySelector<HTMLElement>('#editor .uf-md-preview')!
        }
        const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
        const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))

        for (let step = 1; step <= 12; step += 1) {
            panes[from].scrollTop = step * 60
            await wait(25)
        }
        // the user scrolls the other pane while the sync scrolls it
        if (other) {
            await frame()
            panes[other].scrollTop = 100
        }

        const positions: Array<[number, number]> = []
        const start = performance.now()

        while (performance.now() - start < 1000) {
            await frame()
            positions.push([panes.editor.scrollTop, panes.preview.scrollTop])
        }

        return positions
    }, [pane, then] as const)

for (const pane of ['editor', 'preview'] as const) {
    test(`scrolling the ${pane} scrolls the other pane once, and both stay still after`, async ({ page }) => {
        await setUp(page)

        const positions = await scrollAndWatch(page, pane)
        const [editorTop, previewTop] = positions.at(-1)!
        // after the sync's animation of 100ms
        const settled = positions.slice(Math.floor(positions.length / 2))

        expect(pane === 'editor' ? editorTop : previewTop).toBe(720)
        expect(pane === 'editor' ? previewTop : editorTop).toBeGreaterThan(0)
        expect(new Set(settled.map((position) => position.join())).size).toBe(1)
    })
}

test('the user scrolling the pane that the sync scrolls takes it over', async ({ page }) => {
    await setUp(page)

    const [, previewTop] = (await scrollAndWatch(page, 'editor', 'preview')).at(-1)!

    expect(previewTop).toBe(100)
})
