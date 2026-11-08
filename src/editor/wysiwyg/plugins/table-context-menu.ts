import { Plugin } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'

import { Emitter } from '../../types/event'
import { findCell, findCellElement } from '../helper/table'
import { i18n as defaultI18n, I18n } from '../../i18n/i18n'
import { icons } from '../../ui/icons'
import { cls } from '../../utils/dom'
import { CellSelection } from './selection/cell-selection'

interface ContextMenuInfo {
    action: string
    command: string
    payload?: {
        align: string
    }
    className: string
    disableInThead?: boolean
}

const contextMenuGroups: ContextMenuInfo[][] = [
    [
        {
            action: 'Add row to up',
            command: 'addRowToUp',
            disableInThead: true,
            className: 'add-row-up'
        },
        {
            action: 'Add row to down',
            command: 'addRowToDown',
            disableInThead: true,
            className: 'add-row-down'
        },
        { action: 'Remove row', command: 'removeRow', disableInThead: true, className: 'remove-row' }
    ],
    [
        { action: 'Add column to left', command: 'addColumnToLeft', className: 'add-column-left' },
        { action: 'Add column to right', command: 'addColumnToRight', className: 'add-column-right' },
        { action: 'Remove column', command: 'removeColumn', className: 'remove-column' }
    ],
    [
        {
            action: 'Align column to left',
            command: 'alignColumn',
            payload: { align: 'left' },
            className: 'align-column-left'
        },
        {
            action: 'Align column to center',
            command: 'alignColumn',
            payload: { align: 'center' },
            className: 'align-column-center'
        },
        {
            action: 'Align column to right',
            command: 'alignColumn',
            payload: { align: 'right' },
            className: 'align-column-right'
        }
    ],
    [{ action: 'Remove table', command: 'removeTable', className: 'remove-table' }]
]

function getContextMenuGroups(eventEmitter: Emitter, inTableHead: boolean, i18n: I18n) {
    return contextMenuGroups
        .map((contextMenuGroup) =>
            contextMenuGroup.map(({ action, command, payload, disableInThead, className }) => ({
                label: i18n.get(action),
                onClick: () => {
                    eventEmitter.emit('command', command, payload)
                },
                disabled: inTableHead && !!disableInThead,
                className,
                icon: icons[className]
            }))
        )
        .concat()
}

/** The cell with the cursor, or the first selected cell. */
function cellAtSelection(view: EditorView) {
    const { selection } = view.state

    if (selection instanceof CellSelection) {
        return view.nodeDOM(selection.startCell.pos) as HTMLElement | null
    }

    const { $from } = selection
    const cell = findCell($from)

    return cell ? (view.nodeDOM($from.before(cell.depth)) as HTMLElement | null) : null
}

export function tableContextMenu(eventEmitter: Emitter, i18n: I18n = defaultI18n) {
    /** Opens the menu at a point in the viewport. */
    const open = (view: EditorView, tableCell: HTMLElement, x: number, y: number) => {
        // the menu is positioned in the editor's frame
        const frame = view.dom.closest(`.${cls('default-ui')}`) ?? (view.dom.parentNode as HTMLElement)
        const { left, top } = frame.getBoundingClientRect()

        eventEmitter.emit('contextmenu', {
            pos: { left: `${x - left - frame.clientLeft}px`, top: `${y - top - frame.clientTop}px` },
            menuGroups: getContextMenuGroups(eventEmitter, tableCell.nodeName === 'TH', i18n),
            tableCell
        })
    }
    /** Opens the menu below the cell with the cursor, from the keyboard. */
    const openAtSelection = (view: EditorView) => {
        const tableCell = cellAtSelection(view)

        if (!tableCell) {
            return false
        }

        const { left, bottom } = tableCell.getBoundingClientRect()

        open(view, tableCell, left, bottom)
        return true
    }

    return new Plugin({
        props: {
            // the menu key and Shift+F10 open it for the cell with the cursor, as the browser's menu
            handleKeyDown: (view: EditorView, ev: KeyboardEvent) =>
                view.editable && (ev.key === 'ContextMenu' || (ev.key === 'F10' && ev.shiftKey)) && openAtSelection(view),
            handleDOMEvents: {
                contextmenu: (view: EditorView, ev: Event) => {
                    // its items change the table, so a read-only editor leaves the browser's menu
                    if (!view.editable) {
                        return false
                    }

                    const tableCell = findCellElement(ev.target as HTMLElement, view.dom)

                    if (tableCell) {
                        const { clientX, clientY } = ev as MouseEvent

                        // just past the pointer, which doesn't cover the first item
                        open(view, tableCell, clientX + 2, clientY + 2)
                    } else if (ev.target !== view.dom || !openAtSelection(view)) {
                        // the menu the browser opens from the keyboard is for the text, at the cursor
                        return false
                    }

                    ev.preventDefault()
                    return true
                }
            }
        }
    })
}
