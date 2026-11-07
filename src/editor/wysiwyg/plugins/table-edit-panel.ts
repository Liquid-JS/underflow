import { Plugin, PluginView } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'

import { Emitter } from '../../types/event'
import { i18n } from '../../i18n/i18n'
import { cls, removeNode } from '../../utils/dom'
import { createTextSelection } from '../../helper/manipulation'
import { createDummyCells } from '../helper/table'
import { TableOffsetMap } from '../helper/table-offset-map'

import { css } from '../../utils/native'

type Action = 'addRow' | 'addColumn' | 'removeRow' | 'removeColumn' | 'removeTable'

interface ButtonInfo {
    action: Action
    index: number
    label: string
    left: number
    top: number
}

/**
 * Shows buttons around the hovered table in the wysiwyg editor:
 * '+' on the divider lines to add a row or column there, '×' to remove a row, a column or the table.
 */
export class TableEditPanel implements PluginView {
    private view: EditorView

    private eventEmitter: Emitter

    private el: HTMLElement | null = null

    private table: HTMLTableElement | null = null

    constructor(view: EditorView, eventEmitter: Emitter) {
        this.view = view
        this.eventEmitter = eventEmitter

        view.dom.addEventListener('mouseover', this.handleMouseover)
        view.dom.addEventListener('mouseleave', this.handleMouseleave)
        view.dom.addEventListener('scroll', this.handleScroll)
        eventEmitter.listen('changeMode', this.handleChangeMode)
    }

    update() {
        if (this.table) {
            if (this.view.dom.contains(this.table)) {
                this.render()
            } else {
                this.hide()
            }
        }
    }

    destroy() {
        this.hide()
        this.view.dom.removeEventListener('mouseover', this.handleMouseover)
        this.view.dom.removeEventListener('mouseleave', this.handleMouseleave)
        this.view.dom.removeEventListener('scroll', this.handleScroll)
        this.eventEmitter.removeEventHandler('changeMode', this.handleChangeMode)
    }

    isOpened() {
        return !!this.el
    }

    show(table: HTMLTableElement) {
        if (this.table !== table) {
            this.hide()
            this.table = table
            this.el = document.createElement('div')
            this.el.className = cls('table-edit-panel')
            this.el.addEventListener('mouseleave', this.handleMouseleave)
            this.view.dom.parentElement!.appendChild(this.el)
            this.render()
        }
    }

    hide() {
        if (this.el) {
            removeNode(this.el)
            this.el = null
        }
        this.table = null
    }

    private handleChangeMode = () => {
        this.hide()
    }

    private handleScroll = () => {
        if (this.table) {
            this.render()
        }
    }

    private handleMouseover = (ev: MouseEvent) => {
        const table = (ev.target as HTMLElement).closest?.('table')

        if (table && this.view.editable && this.view.dom.contains(table)) {
            this.show(table)
        } else {
            this.hide()
        }
    }

    private handleMouseleave = (ev: MouseEvent) => {
        const to = ev.relatedTarget as Node | null
        const inPanel = this.el && to && this.el.contains(to)
        const inTable = this.table && to && this.table.contains(to)

        if (!inPanel && !inTable) {
            this.hide()
        }
    }

    private getMap() {
        const cell = this.table?.querySelector('th, td')

        if (!cell) {
            return null
        }

        const { doc } = this.view.state

        return TableOffsetMap.create(doc.resolve(this.view.posAtDOM(cell, 0)))
    }

    private getButtons(): ButtonInfo[] {
        const table = this.table!
        const rows = Array.from(table.querySelectorAll('tr'))
        const cells = Array.from(rows[0]?.querySelectorAll('th, td') || [])
        const containerRect = this.view.dom.parentElement!.getBoundingClientRect()
        const tableRect = table.getBoundingClientRect()
        const left = tableRect.left - containerRect.left
        const top = tableRect.top - containerRect.top
        const right = tableRect.right - containerRect.left
        const bottom = tableRect.bottom - containerRect.top
        const buttons: ButtonInfo[] = []

        // add a column on every vertical divider line
        cells.forEach((cell, index) => {
            const cellRect = cell.getBoundingClientRect()

            buttons.push({
                action: 'addColumn',
                index,
                label: i18n.get(index ? 'Add column to right' : 'Add column to left'),
                left: cellRect.left - containerRect.left,
                top
            })
            if (cells.length > 1) {
                buttons.push({
                    action: 'removeColumn',
                    index,
                    label: i18n.get('Remove column'),
                    left: (cellRect.left + cellRect.right) / 2 - containerRect.left,
                    top: bottom
                })
            }
        })
        buttons.push({
            action: 'addColumn',
            index: cells.length,
            label: i18n.get('Add column to right'),
            left: right,
            top
        })

        // add a row on every horizontal divider line below the header row
        rows.forEach((row, index) => {
            const rowRect = row.getBoundingClientRect()

            if (index > 0) {
                buttons.push({
                    action: 'addRow',
                    index,
                    label: i18n.get('Add row to down'),
                    left,
                    top: rowRect.top - containerRect.top
                })
                if (rows.length > 2) {
                    buttons.push({
                        action: 'removeRow',
                        index,
                        label: i18n.get('Remove row'),
                        left: right,
                        top: (rowRect.top + rowRect.bottom) / 2 - containerRect.top
                    })
                }
            }
        })
        buttons.push({
            action: 'addRow',
            index: rows.length,
            label: i18n.get('Add row to down'),
            left,
            top: bottom
        })

        buttons.push({
            action: 'removeTable',
            index: 0,
            label: i18n.get('Remove table'),
            left: right,
            top: bottom
        })

        return buttons
    }

    private render() {
        if (!this.el || !this.table) {
            return
        }

        this.el.innerHTML = ''

        this.getButtons().forEach(({ action, index, label, left, top }) => {
            const button = document.createElement('button')
            const removing = action.indexOf('remove') === 0

            button.type = 'button'
            button.tabIndex = 0
            button.className = `${cls(removing ? 'table-remove-button' : 'table-add-button')} ${cls(
                `table-${action}`
            )}`
            button.textContent = removing ? '×' : '+'
            button.title = label
            button.setAttribute('aria-label', label)
            button.setAttribute('data-index', String(index))
            css(button, { left: `${left}px`, top: `${top}px` })
            button.addEventListener('mousedown', (ev) => ev.preventDefault())
            button.addEventListener('click', () => this.exec(action, index))

            this.el!.appendChild(button)
        })
    }

    private exec(action: Action, index: number) {
        const map = this.getMap()

        if (!map) {
            return
        }

        const { tr, schema } = this.view.state
        const { totalRowCount, totalColumnCount } = map

        if (action === 'addRow') {
            const pos = index < totalRowCount ? map.posAt(index, 0) - 1 : map.tableEndOffset - 2
            const row = schema.nodes.tableRow.create(
                null,
                createDummyCells(totalColumnCount, index, schema)
            )

            tr.insert(pos, row).setSelection(createTextSelection(tr, pos + 3))
        } else if (action === 'addColumn') {
            for (let rowIdx = 0; rowIdx < totalRowCount; rowIdx += 1) {
                const pos = map.posAt(rowIdx, index)

                tr.insert(tr.mapping.map(pos), createDummyCells(1, rowIdx, schema))
            }
        } else if (action === 'removeRow') {
            const from = map.getCellInfo(index, 0).offset - 1
            const { offset, nodeSize } = map.getCellInfo(index, totalColumnCount - 1)

            tr.delete(from, offset + nodeSize + 1)
        } else if (action === 'removeColumn') {
            for (let rowIdx = 0; rowIdx < totalRowCount; rowIdx += 1) {
                const { offset, nodeSize } = map.getCellInfo(rowIdx, index)
                const from = tr.mapping.map(offset)

                tr.delete(from, from + nodeSize)
            }
        } else {
            const from = map.tableStartOffset - 1

            tr.delete(from, map.tableEndOffset).setSelection(createTextSelection(tr, from))
            this.hide()
        }

        this.view.dispatch(tr.scrollIntoView())
        this.view.focus()
    }
}

export function tableEditPanel(eventEmitter: Emitter) {
    return new Plugin({
        view: (view) => new TableEditPanel(view, eventEmitter)
    })
}
