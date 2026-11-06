import { Node as ProsemirrorNode, DOMOutputSpec } from 'prosemirror-model'

import { EditorCommand } from '../../types/spec'
import { NodeSchema } from '../../spec/node'
import { getWwCommands } from '../../commands/ww-commands'
import { changeList } from '../command/list'

import { getDefaultCustomAttrs, getCustomAttrs } from '../helper/node'

export class OrderedList extends NodeSchema {
    get name() {
        return 'orderedList'
    }

    get schema() {
        return {
            content: 'listItem+',
            group: 'block',
            attrs: {
                order: { default: 1 },
                rawHTML: { default: null },
                // a tight list has no blank lines between its items and their blocks
                tight: { default: true },
                ...getDefaultCustomAttrs()
            },
            parseDOM: [
                {
                    tag: 'ol',
                    getAttrs: (dom: Node | string) => {
                        const start = (dom as HTMLElement).getAttribute('start')
                        const rawHTML = (dom as HTMLElement).getAttribute('data-raw-html')

                        return {
                            order: (dom as HTMLElement).hasAttribute('start') ? Number(start) : 1,
                            ...(rawHTML && { rawHTML })
                        }
                    }
                }
            ],
            toDOM: ({ attrs }: ProsemirrorNode): DOMOutputSpec => [
                attrs.rawHTML || 'ol',
                { start: attrs.order === 1 ? null : attrs.order, ...getCustomAttrs(attrs) },
                0
            ]
        }
    }

    commands(): EditorCommand {
        return () => (state, dispatch) => changeList(state.schema.nodes.orderedList)(state, dispatch)
    }

    keymaps() {
        const orderedListCommand = this.commands()()
        const { indent, outdent } = getWwCommands()

        return {
            'Mod-o': orderedListCommand,
            'Mod-O': orderedListCommand,
            'Tab': indent(),
            'Shift-Tab': outdent()
        }
    }
}
