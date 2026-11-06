import { DOMOutputSpec, Node as ProsemirrorNode } from 'prosemirror-model'

import { NodeSchema } from '../../spec/node'
import { getDefaultCustomAttrs, getCustomAttrs } from '../helper/node'

export class Paragraph extends NodeSchema {
    get name() {
        return 'paragraph'
    }

    get schema() {
        return {
            content: 'inline*',
            group: 'block',
            attrs: {
                ...getDefaultCustomAttrs()
            },
            parseDOM: [{ tag: 'p' }],
            toDOM: ({ attrs }: ProsemirrorNode): DOMOutputSpec => ['p', getCustomAttrs(attrs), 0]
        }
    }
}
