import { ResolvedPos } from 'prosemirror-model'
import { EditorView } from 'prosemirror-view'
import { PluginKey, Selection, TextSelection } from 'prosemirror-state'

import { findCell, findCellElement } from '../../helper/table'

import { CellSelection } from './cell-selection'

interface EventHandlers {
    mousedown: (ev: Event) => void
    mousemove: (ev: Event) => void
    mouseup: () => void
    dblclick: (ev: Event) => void
}

export const pluginKey = new PluginKey('cellSelection')

const MOUSE_RIGHT_BUTTON = 2

export class TableSelection {
    private view: EditorView

    private handlers: EventHandlers

    private startCellPos: ResolvedPos | null

    constructor(view: EditorView) {
        this.view = view

        this.handlers = {
            mousedown: this.handleMousedown.bind(this),
            mousemove: this.handleMousemove.bind(this),
            mouseup: this.handleMouseup.bind(this),
            dblclick: this.handleDblclick.bind(this)
        }

        this.startCellPos = null

        this.init()
    }

    init() {
        this.view.dom.addEventListener('mousedown', this.handlers.mousedown)
        this.view.dom.addEventListener('dblclick', this.handlers.dblclick)
    }

    handleMousedown(ev: Event) {
        const foundCell = findCellElement(ev.target as HTMLElement, this.view.dom)

        if ((ev as MouseEvent).button === MOUSE_RIGHT_BUTTON) {
            ev.preventDefault()
            return
        }

        if (foundCell) {
            const startCellPos = this.getCellPos(ev as MouseEvent)

            if (startCellPos) {
                this.startCellPos = startCellPos
            }

            this.bindEvent()
        }
    }

    handleMousemove(ev: Event) {
        const prevEndCellOffset = pluginKey.getState(this.view.state)
        const endCellPos = this.getCellPos(ev as MouseEvent)
        const { startCellPos } = this

        let prevEndCellPos

        if (prevEndCellOffset) {
            prevEndCellPos = this.view.state.doc.resolve(prevEndCellOffset)
        } else if (startCellPos && endCellPos && startCellPos.pos !== endCellPos.pos) {
            // start the cell selection only when the mouse leaves the starting cell,
            // so that the text inside a single cell can still be selected
            prevEndCellPos = startCellPos
        }

        if (prevEndCellPos && startCellPos && endCellPos) {
            this.setCellSelection(startCellPos, endCellPos)
        }
    }

    handleMouseup() {
        this.startCellPos = null

        this.unbindEvent()

        if (pluginKey.getState(this.view.state) !== null) {
            this.view.dispatch(this.view.state.tr.setMeta(pluginKey, -1))
        }
    }

    // select the whole content of the cell on double click
    handleDblclick(ev: Event) {
        if (!findCellElement(ev.target as HTMLElement, this.view.dom)) {
            return
        }

        const cellPos = this.getCellPos(ev as MouseEvent)
        const cell = cellPos && cellPos.nodeAfter

        if (cellPos && cell) {
            const { doc, tr } = this.view.state
            const start = Selection.findFrom(doc.resolve(cellPos.pos + 1), 1, true)
            const end = Selection.findFrom(doc.resolve(cellPos.pos + cell.nodeSize - 1), -1, true)

            if (start && end && start.from <= end.to) {
                ev.preventDefault()
                this.view.dispatch(tr.setSelection(TextSelection.create(doc, start.from, end.to)))
            }
        }
    }

    bindEvent() {
        const { dom } = this.view

        dom.addEventListener('mousemove', this.handlers.mousemove)
        dom.addEventListener('mouseup', this.handlers.mouseup)
    }

    unbindEvent() {
        const { dom } = this.view

        dom.removeEventListener('mousemove', this.handlers.mousemove)
        dom.removeEventListener('mouseup', this.handlers.mouseup)
    }

    getCellPos({ clientX, clientY }: MouseEvent) {
        const mousePos = this.view.posAtCoords({ left: clientX, top: clientY })

        if (mousePos) {
            const { doc } = this.view.state
            const currentPos = doc.resolve(mousePos.pos)
            const foundCell = findCell(currentPos)

            if (foundCell) {
                const cellOffset = currentPos.before(foundCell.depth)

                return doc.resolve(cellOffset)
            }
        }

        return null
    }

    setCellSelection(startCellPos: ResolvedPos, endCellPos: ResolvedPos) {
        const { selection, tr } = this.view.state
        const starting = pluginKey.getState(this.view.state) === null
        const cellSelection = new CellSelection(startCellPos, endCellPos)

        if (starting || !selection.eq(cellSelection)) {
            const newTr = tr.setSelection(cellSelection)

            if (starting) {
                newTr.setMeta(pluginKey, endCellPos.pos)
            }

            this.view.dispatch!(newTr)
        }
    }

    destroy() {
        this.view.dom.removeEventListener('mousedown', this.handlers.mousedown)
        this.view.dom.removeEventListener('dblclick', this.handlers.dblclick)
    }
}
