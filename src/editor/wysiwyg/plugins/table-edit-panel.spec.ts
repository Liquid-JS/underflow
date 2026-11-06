import { oneLineTrim } from 'common-tags'
import { DOMParser } from 'prosemirror-model'

import { WysiwygEditor } from '../ww-editor'
import { EventEmitter } from '../../event/event-emitter'
import { WwToDOMAdaptor } from '../adaptor/ww-to-dom-adaptor'
import { cls } from '../../utils/dom'

describe('table edit panel', () => {
    let wwe: WysiwygEditor; let em: EventEmitter

    function createEditor(options = {}) {
        em = new EventEmitter()
        wwe = new WysiwygEditor(em, { toDOMAdaptor: new WwToDOMAdaptor({}, {}), ...options })
        document.body.appendChild(wwe.el)
    }

    function setContent(content: string) {
        const wrapper = document.createElement('div')

        wrapper.innerHTML = content
        wwe.setModel(DOMParser.fromSchema(wwe.schema).parse(wrapper))
    }

    function getPanel() {
        return wwe.el.querySelector<HTMLElement>(`.${cls('table-edit-panel')}`)
    }

    function hoverTable() {
        wwe.view.dom.querySelector('td')!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    }

    function clickButton(action: string, index = 0) {
        hoverTable()
        getPanel()!
            .querySelector<HTMLElement>(`.${cls(`table-${action}`)}[data-index="${index}"]`)!
            .click()
    }

    beforeEach(() => {
        createEditor()
        setContent(oneLineTrim`
      <p>before</p>
      <table>
        <thead><tr><th><p>h1</p></th><th><p>h2</p></th></tr></thead>
        <tbody>
          <tr><td><p>a1</p></td><td><p>a2</p></td></tr>
          <tr><td><p>b1</p></td><td><p>b2</p></td></tr>
        </tbody>
      </table>
    `)
    })

    afterEach(() => {
        document.body.removeChild(wwe.el)
        wwe.destroy()
    })

    it('should be shown when hovering a table and hidden when leaving it', () => {
        hoverTable()

        expect(getPanel()).not.toBeNull()

        wwe.view.dom.querySelector('p')!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))

        expect(getPanel()).toBeNull()
    })

    it('should add a row on the divider line', () => {
        clickButton('addRow', 2)

        expect(wwe.getHTML()).toContain(
            oneLineTrim`
        <tr><td><p>a1</p></td><td><p>a2</p></td></tr>
        <tr><td><p><br></p></td><td><p><br></p></td></tr>
        <tr><td><p>b1</p></td><td><p>b2</p></td></tr>
      `
        )
    })

    it('should add a row after the last row', () => {
        clickButton('addRow', 3)

        expect(wwe.getHTML()).toContain(
            '<tr><td><p>b1</p></td><td><p>b2</p></td></tr><tr><td><p><br></p></td><td><p><br></p></td></tr></tbody>'
        )
    })

    it('should add a column on the divider line', () => {
        clickButton('addColumn', 1)

        expect(wwe.getHTML()).toContain(
            oneLineTrim`
        <thead><tr><th><p>h1</p></th><th><p><br></p></th><th><p>h2</p></th></tr></thead>
        <tbody>
          <tr><td><p>a1</p></td><td><p><br></p></td><td><p>a2</p></td></tr>
          <tr><td><p>b1</p></td><td><p><br></p></td><td><p>b2</p></td></tr>
        </tbody>
      `
        )
    })

    it('should add a column after the last column', () => {
        clickButton('addColumn', 2)

        expect(wwe.getHTML()).toContain(
            '<tr><th><p>h1</p></th><th><p>h2</p></th><th><p><br></p></th></tr>'
        )
    })

    it('should remove a row', () => {
        clickButton('removeRow', 1)

        expect(wwe.getHTML()).toContain('<tbody><tr><td><p>b1</p></td><td><p>b2</p></td></tr></tbody>')
    })

    it('should not offer removing the header row or the last body row', () => {
        hoverTable()

        expect(getPanel()!.querySelector(`.${cls('table-remove-row')}[data-index="0"]`)).toBeNull()

        clickButton('removeRow', 1)
        hoverTable()

        expect(getPanel()!.querySelector(`.${cls('table-remove-row')}`)).toBeNull()
    })

    it('should remove a column', () => {
        clickButton('removeColumn', 0)

        expect(wwe.getHTML()).toContain(
            oneLineTrim`
        <thead><tr><th><p>h2</p></th></tr></thead>
        <tbody><tr><td><p>a2</p></td></tr><tr><td><p>b2</p></td></tr></tbody>
      `
        )
    })

    it('should remove the table', () => {
        clickButton('removeTable')

        expect(wwe.getHTML()).toBe('<p>before</p>')
        expect(getPanel()).toBeNull()
    })

    it('should not be shown when it is disabled by the option', () => {
        document.body.removeChild(wwe.el)
        wwe.destroy()
        createEditor({ editPanel: { useTableEditPanel: false } })
        setContent(
            '<table><thead><tr><th><p>h</p></th></tr></thead><tbody><tr><td><p>c</p></td></tr></tbody></table>'
        )

        hoverTable()

        expect(getPanel()).toBeNull()
    })
})
