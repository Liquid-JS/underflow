import { DOMOutputSpec, Node as ProsemirrorNode } from 'prosemirror-model'
import { wrapIn } from 'prosemirror-commands'

import { EditorCommand } from '../../types/spec'
import { NodeSchema } from '../../spec/node'
import {
    createDOMInfoParsedRawHTML,
    getCustomAttrs,
    getDefaultCustomAttrs
} from '../helper/node'

export class BlockQuote extends NodeSchema {
    get name() {
        return 'blockQuote'
    }

    get schema() {
        return {
            attrs: {
                rawHTML: { default: null },
                ...getDefaultCustomAttrs()
            },
            content: 'block+',
            group: 'block',
            parseDOM: [createDOMInfoParsedRawHTML('blockquote')],
            toDOM: ({ attrs }: ProsemirrorNode): DOMOutputSpec => ['blockquote', getCustomAttrs(attrs), 0]
        }
    }

    commands(): EditorCommand {
        return () => (state, dispatch) => wrapIn(state.schema.nodes.blockQuote)(state, dispatch)
    }

    keymaps() {
        const blockQuoteCommand = this.commands()()

        return {
            'Shift-Mod-.': blockQuoteCommand
        }
    }
}
