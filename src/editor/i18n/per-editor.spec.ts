import { getByText } from '@testing-library/dom'
import { Editor } from '../editor'
import { EditorOptions, PluginContext } from '../types/editor'
import { cls } from '../utils/dom'
import { deDE } from './de-de'

describe('languages of several editors', () => {
    const editors: Array<{ editor: Editor, el: HTMLElement }> = []
    const pluginTexts: Record<string, string> = {}

    function create(options: Partial<EditorOptions>) {
        const el = document.createElement('div')

        document.body.appendChild(el)

        const editor = new Editor({
            el,
            initialEditType: 'markdown',
            previewStyle: 'tab',
            initialValue: '| a | b |\n| - | - |\n| 1 | 2 |',
            // a plugin shows texts in its editor's language too
            plugins: [(context: PluginContext) => {
                pluginTexts[options.language ?? 'en-US'] = context.i18n.get('Write')
                return {}
            }],
            ...options
        })

        editors.push({ editor, el })
        return el
    }

    beforeAll(() => {
        Editor.setLanguage(['de', 'de-DE'], deDE)
    })

    afterEach(() => {
        editors.splice(0).forEach(({ editor, el }) => {
            editor.destroy()
            el.remove()
        })
    })

    it('should show each editor in its own language, whichever is made last', () => {
        const german = create({ language: 'de-DE' })
        const english = create({})
        const label = (el: HTMLElement, selector: string) => el.querySelector(selector)!.getAttribute('aria-label')

        for (const [el, texts] of [
            [german, { headings: 'Überschriften', write: 'Verfassen', preview: 'Vorschau', toolbar: deDE['Text Formatting'] }],
            [english, { headings: 'Headings', write: 'Write', preview: 'Preview', toolbar: 'Text formatting' }]
        ] as const) {
            expect(label(el, '.uf-toolbar-icons.heading')).toBe(texts.headings)
            expect(label(el, '[role="toolbar"]')).toBe(texts.toolbar)
            expect(getByText(el.querySelector<HTMLElement>(`.${cls('md-tab-container')}`)!, texts.write)).toBeTruthy()
            expect(label(el, `.${cls('md-preview')}`)).toBe(texts.preview)
        }
        expect(pluginTexts).toEqual({ 'de-DE': 'Verfassen', 'en-US': 'Write' })
    })

    it('should show the popups and the table menu in the editor\'s language', () => {
        const german = create({ language: 'de-DE' })

        create({})
        german.querySelector<HTMLElement>('.uf-toolbar-icons.heading')!.click()
        expect(getByText(german.querySelector<HTMLElement>(`.${cls('popup')}`)!, 'Überschrift 1')).toBeTruthy()

        const [{ editor }] = editors
        const menus = vi.fn()

        editor.changeMode('wysiwyg')
        editor.eventEmitter.listen('contextmenu', menus)
        german.querySelector(`.${cls('ww-container')} td`)!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))

        const labels = menus.mock.calls[0][0].menuGroups.flat().map(({ label }: { label: string }) => label)

        expect(labels).toContain(deDE['Remove row'])
    })
})
