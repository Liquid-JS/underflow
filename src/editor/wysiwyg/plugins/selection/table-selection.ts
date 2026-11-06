import { EditorState, Plugin, SelectionRange } from 'prosemirror-state'
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view'

import { cls } from '../../../utils/dom'
import { isNull } from '../../../utils/native'
import { CellSelection } from './cell-selection'
import { TableSelection, pluginKey } from './table-selection-view'

const SELECTED_CELL_CLASS_NAME = cls('cell-selected')

function drawCellSelection({ selection, doc }: EditorState) {
    if (selection instanceof CellSelection) {
        const cells: Decoration[] = []
        const { ranges } = selection

        ranges.forEach(({ $from, $to }: SelectionRange) => {
            cells.push(Decoration.node($from.pos - 1, $to.pos + 1, { class: SELECTED_CELL_CLASS_NAME }))
        })

        return DecorationSet.create(doc, cells)
    }

    return null
}

export function tableSelection() {
    return new Plugin({
        key: pluginKey,
        state: {
            init: () => null,
            apply: (tr, value) => {
                const cellOffset = tr.getMeta(pluginKey)

                if (cellOffset) {
                    return cellOffset === -1 ? null : cellOffset
                }

                if (isNull(value) || !tr.docChanged) {
                    return value
                }

                const { deleted, pos } = tr.mapping.mapResult(value)

                return deleted ? null : pos
            }
        },
        props: {
            decorations: drawCellSelection,
            createSelectionBetween: ({ state }) => {
                if (!isNull(pluginKey.getState(state))) {
                    return state.selection
                }

                return null
            }
        },
        view: (editorView: EditorView) => new TableSelection(editorView)
    })
}
