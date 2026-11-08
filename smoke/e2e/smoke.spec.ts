import { expect, test } from '@playwright/test'

test('the packed library works in an application bundle', async ({ page }) => {
    const errors: string[] = []

    page.on('pageerror', (error) => errors.push(String(error)))
    await page.goto('/')

    const smoke = await page.evaluate(() => (window as any).smoke)

    expect(errors).toEqual([])
    expect(smoke).toEqual({
        markdown: '# Hallo\n\n```javascript\nconst a = 1;\nconst b = 2;\n```',
        isEditorCore: true,
        isViewer: true,
        parsed: 'paragraph',
        nodeAtPos: 'text',
        rendered: '<h1>Title</h1>\n<p>Some <i>text</i></p>\n',
        // the custom HTML renderer applies to the preview
        previewHTML:
      '<h1 id="heading-1">Hallo</h1>' +
      '<pre><code data-language="javascript">const a = 1;\nconst b = 2;</code></pre>',
        renderedMarkdown: '<p><strong class="smoke-strong">render</strong></p>\n'
    })

    // the German locale applies to the toolbar
    await expect(page.locator('#editor .uf-toolbar-icons.bold')).toHaveAttribute(
        'aria-label',
        /^Fett/
    )
    // the icons are inline SVG, sized by the stylesheets compiled from the published SCSS
    const icon = page.locator('#editor .uf-toolbar-icons.bold svg')

    await expect(icon).toHaveAttribute('viewBox', '0 0 24 24')
    expect(await icon.boundingBox()).toMatchObject({ width: 22, height: 22 })
    // the plugin highlights and numbers code in WYSIWYG
    await expect(page.locator('#editor .hljs-keyword').first()).toHaveText('const')
    await expect(page.locator('#editor .hljs-ln-n')).toHaveCount(2)
    // the viewer renders markdown
    await expect(page.locator('#viewer em')).toHaveText('viewer')
    // a plugin's HTML renderers apply to the viewer
    await expect(page.locator('#viewer strong.smoke-strong')).toHaveText('bold')
})
