import { Node as ProsemirrorNode, DOMOutputSpec } from 'prosemirror-model'
import { setBlockType } from 'prosemirror-commands'

import { EditorCommand } from '../../types/spec'
import { NodeSchema } from '../../spec/node'
import { getCustomAttrs, getDefaultCustomAttrs } from '../helper/node'

export class Heading extends NodeSchema {
    get name() {
        return 'heading'
    }

    get levels() {
        return [1, 2, 3, 4, 5, 6]
    }

    get schema() {
        const parseDOM = this.levels.map((level) => ({
            tag: `h${level}`,
            getAttrs: (dom: Node | string) => {
                const rawHTML = (dom as HTMLElement).getAttribute('data-raw-html')

                return {
                    level,
                    ...(rawHTML && { rawHTML })
                }
            }
        }))

        return {
            attrs: {
                level: { default: 1 },
                headingType: { default: 'atx' },
                rawHTML: { default: null },
                ...getDefaultCustomAttrs()
            },
            content: 'inline*',
            group: 'block',
            defining: true,
            parseDOM,
            toDOM: ({ attrs }: ProsemirrorNode): DOMOutputSpec => [`h${attrs.level}`, getCustomAttrs(attrs), 0]
        }
    }

    commands(): EditorCommand {
        return (payload) => (state, dispatch) => {
            const nodeType = state.schema.nodes[payload!.level ? 'heading' : 'paragraph']

            return setBlockType(nodeType, payload)(state, dispatch)
        }
    }
}
