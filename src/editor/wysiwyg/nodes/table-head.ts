import { DOMOutputSpec, Node as ProsemirrorNode } from 'prosemirror-model'

import { NodeSchema } from '../../spec/node'
import {
    createDOMInfoParsedRawHTML,
    getCustomAttrs,
    getDefaultCustomAttrs
} from '../helper/node'

export class TableHead extends NodeSchema {
    get name() {
        return 'tableHead'
    }

    get schema() {
        return {
            content: 'tableRow{1}',
            attrs: {
                rawHTML: { default: null },
                ...getDefaultCustomAttrs()
            },
            parseDOM: [createDOMInfoParsedRawHTML('thead')],
            toDOM: ({ attrs }: ProsemirrorNode): DOMOutputSpec => ['thead', getCustomAttrs(attrs), 0]
        }
    }
}
