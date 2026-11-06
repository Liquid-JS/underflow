import { undoInputRule } from 'prosemirror-inputrules'
import { EventEmitter } from '../../event/event-emitter'
import { WysiwygEditor } from '../ww-editor'
import { WwToDOMAdaptor } from '../adaptor/ww-to-dom-adaptor'

describe('markdown shortcuts', () => {
    let wwe: WysiwygEditor

    function type(text: string) {
        text.split('').forEach((char) => {
            const { view } = wwe
            const { from, to } = view.state.selection
            const handled = view.someProp('handleTextInput', (fn) => fn(view, from, to, char, () => view.state.tr))

            if (!handled) {
                view.dispatch(view.state.tr.insertText(char, from, to))
            }
        })
    }

    beforeEach(() => {
        wwe = new WysiwygEditor(new EventEmitter(), { toDOMAdaptor: new WwToDOMAdaptor({}, {}) })
        wwe.setSelection(1, 1)
    })

    afterEach(() => {
        wwe.destroy()
    })

    it.each([
        ['## Title', '<h2>Title</h2>'],
        ['> quote', '<blockquote><p>quote</p></blockquote>'],
        ['- item', '<ul><li><p>item</p></li></ul>'],
        ['* item', '<ul><li><p>item</p></li></ul>'],
        ['3. item', '<ol start="3"><li><p>item</p></li></ol>'],
        ['[x] done', '<ul><li class="task-list-item checked" data-task="true" data-task-checked="true"><p>done</p></li></ul>'],
        ['```js code', '<div data-language="js" class="uf-ww-code-block"><pre><code data-language="js">code</code></pre></div>']
    ])('%s', (input, html) => {
        type(input)

        expect(wwe.getHTML()).toBe(html)
    })

    it('should make a list item a task', () => {
        type('- [ ] task')

        expect(wwe.getHTML()).toBe(
            '<ul><li class="task-list-item" data-task="true"><p>task</p></li></ul>'
        )
    })

    it('should not convert text that isn\'t at the start of a paragraph', () => {
        type('a # b')

        expect(wwe.getHTML()).toBe('<p>a # b</p>')
    })

    it('should undo a conversion with Backspace right after it', () => {
        type('# ')

        expect(undoInputRule(wwe.view.state, wwe.view.dispatch)).toBe(true)
        expect(wwe.getHTML()).toBe('<p># </p>')
    })
})
