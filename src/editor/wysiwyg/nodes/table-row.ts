import { DOMOutputSpec, Node as ProsemirrorNode } from 'prosemirror-model'

import { NodeSchema } from '../../spec/node'
import { getDefaultCustomAttrs, getCustomAttrs, getRawHTML } from '../helper/node'

export class TableRow extends NodeSchema {
    get name() {
        return 'tableRow'
    }

    get schema() {
        return {
            content: '(tableHeadCell | tableBodyCell)*',
            attrs: {
                rawHTML: { default: null },
                ...getDefaultCustomAttrs()
            },
            parseDOM: [
                {
                    tag: 'tr',
                    getAttrs: (dom: Node | string) => {
                        const columns = (dom as HTMLElement).children.length
                        const rawHTML = getRawHTML(dom)

                        if (!columns) {
                            return false
                        }

                        return { ...(rawHTML && { rawHTML }) }
                    }
                }
            ],
            toDOM: ({ attrs }: ProsemirrorNode): DOMOutputSpec => ['tr', getCustomAttrs(attrs), 0]
        }
    }
}
