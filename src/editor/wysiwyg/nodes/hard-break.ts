import type { DOMOutputSpec } from 'prosemirror-model'
import type { Command } from 'prosemirror-state'

import { NodeSchema } from '../../spec/node'

/**
 * A hard line break inside a paragraph (`<br>`), inserted with Shift+Enter. It's written to
 * markdown as a backslash at the end of the line, or as `<br>` in a table cell.
 */
export class HardBreak extends NodeSchema {
    get name() {
        return 'hardBreak'
    }

    get schema() {
        return {
            inline: true,
            group: 'inline',
            selectable: false,
            parseDOM: [{ tag: 'br' }],
            toDOM: (): DOMOutputSpec => ['br']
        }
    }

    private insertHardBreak(): Command {
        return (state, dispatch) => {
            const { $from } = state.selection

            if ($from.parent.type.name !== 'paragraph') {
                return false
            }

            const { hardBreak } = state.schema.nodes

            dispatch?.(state.tr.replaceSelectionWith(hardBreak.create()).scrollIntoView())

            return true
        }
    }

    keymaps() {
        return {
            'Shift-Enter': this.insertHardBreak()
        }
    }
}
