import { Node as ProsemirrorNode, DOMOutputSpec } from 'prosemirror-model'

import { EditorCommand } from '../../types/spec'
import { NodeSchema } from '../../spec/node'

import { getDefaultCustomAttrs, getCustomAttrs } from '../helper/node'

const ROOT_BLOCK_DEPTH = 1

export class ThematicBreak extends NodeSchema {
    get name() {
        return 'thematicBreak'
    }

    get schema() {
        return {
            attrs: {
                rawHTML: { default: null },
                ...getDefaultCustomAttrs()
            },
            group: 'block',
            parseDOM: [{ tag: 'hr' }],
            selectable: false,
            toDOM: ({ attrs }: ProsemirrorNode): DOMOutputSpec => ['div', getCustomAttrs(attrs), [attrs.rawHTML || 'hr']]
        }
    }

    private hr(): EditorCommand {
        return () => (state, dispatch) => {
            const { $from, $to } = state.selection

            if ($from === $to) {
                const { doc } = state
                const { thematicBreak, paragraph } = state.schema.nodes

                const nodes: ProsemirrorNode[] = [thematicBreak.create()]

                // after the current block where its container takes a thematic break, as a list item
                // does, otherwise after the top-level block (e.g. after a table)
                const containerDepth = $from.depth - 1
                const container = $from.node(containerDepth)
                const index = $from.indexAfter(containerDepth)
                const depth = container.canReplaceWith(index, index, thematicBreak)
                    ? $from.depth
                    : ROOT_BLOCK_DEPTH
                const parent = $from.node(depth - 1)
                const lastBlock = parent.lastChild === $from.node(depth)
                const nextHr = doc.resolve($from.after(depth)).nodeAfter?.type.name === this.name

                // a paragraph after the line keeps a place to write
                if (lastBlock || nextHr) {
                    nodes.push(paragraph.create())
                }

                dispatch!(state.tr.insert($from.after(depth), nodes).scrollIntoView())

                return true
            }

            return false
        }
    }

    commands() {
        return { hr: this.hr() }
    }

    keymaps() {
        const hrCommand = this.hr()()

        return {
            'Mod-l': hrCommand,
            'Mod-L': hrCommand
        }
    }
}
