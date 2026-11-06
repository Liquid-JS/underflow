import { DOMOutputSpec } from 'prosemirror-model'
import { exitCode } from 'prosemirror-commands'

import { EditorCommand } from '../../types/spec'
import { NodeSchema } from '../../spec/node'

/**
 * HTML that WYSIWYG can't show without losing something (an HTML comment, an `<iframe>`, attributes
 * it doesn't keep), shown and edited as its source, and written back to markdown as it is.
 */
export class HTMLSource extends NodeSchema {
    get name() {
        return 'htmlSource'
    }

    get schema() {
        return {
            content: 'text*',
            group: 'block',
            code: true,
            defining: true,
            marks: '',
            parseDOM: [{ preserveWhitespace: 'full' as const, tag: 'div[data-html-source]' }],
            toDOM: (): DOMOutputSpec => ['div', { 'data-html-source': 'true' }, 0]
        }
    }

    commands(): EditorCommand {
        return () => (state, dispatch, view) => {
            const { $from } = state.selection

            if (view!.endOfTextblock('down') && $from.node().type.name === 'htmlSource') {
                return exitCode(state, dispatch)
            }

            return false
        }
    }

    keymaps() {
        return {
            Enter: this.commands()()
        }
    }
}
