import { oneLineTrim } from 'common-tags'
import { createHTMLrenderer, removeDataAttr } from '../../test/markdown'
import { Viewer } from './viewer'

describe('Viewer', () => {
    let viewer: Viewer; let container: HTMLElement

    function getViewerHTML() {
        return oneLineTrim`${removeDataAttr(
            container.querySelector('.uf-contents')!.innerHTML
        )}`
    }

    beforeEach(() => {
        container = document.createElement('div')

        viewer = new Viewer({
            el: container,
            extendedAutolinks: true,
            frontMatter: true,
            initialValue: '# test\n* list1\n* list2',
            customHTMLRenderer: createHTMLrenderer()
        })

        document.body.appendChild(container)
    })

    afterEach(() => {
        viewer.destroy()
        document.body.removeChild(container)
    })

    it('should render properly', () => {
        const expected = oneLineTrim`
      <h1>test</h1>
      <ul>
        <li>
          <p>list1</p>
        </li>
        <li>
          <p>list2</p>
        </li>
      </ul>
    `

        expect(getViewerHTML()).toBe(expected)
    })

    it('should leave the contents without a role or tab stop, unlike the editor\'s preview', () => {
        expect(container.querySelector('[role="region"], [tabindex]')).toBeNull()
    })

    it('should change the theme by setTheme API', () => {
        const spy = vi.fn()

        viewer.on('changeTheme', spy)
        viewer.setTheme('dark')

        expect(container).toHaveClass('uf-dark')
        expect(spy).toHaveBeenCalledWith('dark')

        viewer.setTheme('light')

        expect(container).not.toHaveClass('uf-dark')
    })

    it('should update preview by setMarkdown API', () => {
        viewer.setMarkdown('> block quote\n# heading *emph*')

        const expected = oneLineTrim`
      <blockquote><p>block quote</p></blockquote>
      <h1>
        heading <em>emph</em>
      </h1>
    `

        expect(getViewerHTML()).toBe(expected)
    })

    it('should render htmlBlock properly', () => {
        viewer.setMarkdown(
            '<iframe src="https://www.youtube.com/embed/XyenY12fzAk" height="315" width="420"></iframe>'
        )

        const expected =
            '<iframe src="https://www.youtube.com/embed/XyenY12fzAk" height="315" width="420"></iframe>'

        expect(getViewerHTML()).toBe(expected)
    })

    it('should render widgets, not interactive', () => {
        const contexts: unknown[] = []
        const el = document.createElement('div')
        const widgetViewer = new Viewer({
            el,
            initialValue: 'hi @joe and `@ann`',
            widgetRules: [
                {
                    rule: /@\w+/,
                    toDOM: (text, context) => {
                        const span = document.createElement('span')

                        contexts.push(context)
                        span.textContent = `user ${text}`

                        return span
                    }
                }
            ]
        })

        expect(removeDataAttr(el.querySelector('.uf-contents')!.innerHTML)).toBe(
            '<p>hi <span class="uf-widget" data-widget="widget0" data-widget-text="@joe">' +
        '<span>user @joe</span></span> and <code data-backticks="1">@ann</code></p>'
        )
        expect(contexts).toEqual([{ interactive: false }])

        widgetViewer.destroy()
    })

    it('should only show task checkboxes', () => {
        viewer.setMarkdown('* [ ] task')

        const item = container.querySelector('.task-list-item')!

        item.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 1, clientY: 1 }))

        expect(item).not.toHaveClass('checked')
    })
})
