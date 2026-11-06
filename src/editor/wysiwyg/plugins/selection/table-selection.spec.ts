import { oneLineTrim } from 'common-tags'
import { DOMParser } from 'prosemirror-model'

import { WysiwygEditor } from '../../ww-editor'
import { EventEmitter } from '../../../event/event-emitter'
import { WwToDOMAdaptor } from '../../adaptor/ww-to-dom-adaptor'
import { CellSelection } from './cell-selection'

describe('table selection by mouse', () => {
    let wwe: WysiwygEditor; let em: EventEmitter

    function setContent(content: string) {
        const wrapper = document.createElement('div')

        wrapper.innerHTML = content

        wwe.setModel(DOMParser.fromSchema(wwe.schema).parse(wrapper))
    }

    function getTextPos(text: string) {
        let found = -1

        wwe.view.state.doc.descendants((node, pos) => {
            if (found < 0 && node.isText && node.text === text) {
                found = pos
            }
            return found < 0
        })

        return found
    }

    function getCellElement(text: string) {
        return Array.from(wwe.view.dom.querySelectorAll('td, th')).find(
            (cell) => cell.textContent === text
        ) as HTMLElement
    }

    // jsdom has no layout, so `clientX` is used as the document position
    function mouse(type: string, target: HTMLElement, pos: number, detail = 1) {
        target.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: pos, detail }))
    }

    beforeEach(() => {
        em = new EventEmitter()
        wwe = new WysiwygEditor(em, { toDOMAdaptor: new WwToDOMAdaptor({}, {}) })
        document.body.appendChild(wwe.el)

        vi.spyOn(wwe.view, 'posAtCoords').mockImplementation(({ left }) => ({ pos: left, inside: -1 }))

        setContent(oneLineTrim`
      <table>
        <thead><tr><th><p>head1</p></th><th><p>head2</p></th></tr></thead>
        <tbody><tr><td><p>a long text in a single table cell</p></td><td><p>baz</p></td></tr></tbody>
      </table>
    `)
    })

    afterEach(() => {
        document.body.removeChild(wwe.el)
        wwe.destroy()
    })

    it('should not create a cell selection while dragging inside a single cell', () => {
        const cell = getCellElement('a long text in a single table cell')
        const start = getTextPos('a long text in a single table cell')

        mouse('mousedown', cell, start)
        // move over every character (enough positions to evict the cached resolved cell position)
        for (let offset = 1; offset <= 'a long text in a single table cell'.length; offset += 1) {
            mouse('mousemove', cell, start + offset)
        }
        for (let offset = 'a long text in a single table cell'.length; offset >= 0; offset -= 1) {
            mouse('mousemove', cell, start + offset)
        }

        expect(wwe.view.state.selection instanceof CellSelection).toBe(false)

        mouse('mouseup', cell, start + 3)
    })

    it('should create a cell selection when dragging to another cell', () => {
        const cell = getCellElement('a long text in a single table cell')

        mouse('mousedown', cell, getTextPos('a long text in a single table cell'))
        mouse('mousemove', getCellElement('baz'), getTextPos('baz'))

        expect(wwe.view.state.selection instanceof CellSelection).toBe(true)

        mouse('mouseup', getCellElement('baz'), getTextPos('baz'))
    })

    it('should select the whole cell content on double click', () => {
        const text = 'a long text in a single table cell'
        const start = getTextPos(text)

        mouse('dblclick', getCellElement(text), start + 3, 2)

        const { from, to } = wwe.view.state.selection

        expect(wwe.view.state.doc.textBetween(from, to)).toBe(text)
    })
})
