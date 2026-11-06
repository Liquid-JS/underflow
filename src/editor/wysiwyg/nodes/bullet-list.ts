import type { Command } from 'prosemirror-state'
import { DOMOutputSpec, Node as ProsemirrorNode } from 'prosemirror-model'

import { NodeSchema } from '../../spec/node'
import { getWwCommands } from '../../commands/ww-commands'
import {
    createDOMInfoParsedRawHTML,
    getCustomAttrs,
    getDefaultCustomAttrs
} from '../helper/node'
import { changeList, toggleTask } from '../command/list'

export class BulletList extends NodeSchema {
    get name() {
        return 'bulletList'
    }

    get schema() {
        return {
            content: 'listItem+',
            group: 'block',
            attrs: {
                rawHTML: { default: null },
                // a tight list has no blank lines between its items and their blocks
                tight: { default: true },
                ...getDefaultCustomAttrs()
            },
            parseDOM: [createDOMInfoParsedRawHTML('ul')],
            toDOM: ({ attrs }: ProsemirrorNode): DOMOutputSpec => ['ul', getCustomAttrs(attrs), 0]
        }
    }

    private changeList(): Command {
        return (state, dispatch) => changeList(state.schema.nodes.bulletList)(state, dispatch)
    }

    commands() {
        return {
            bulletList: this.changeList,
            taskList: toggleTask
        }
    }

    keymaps() {
        const bulletListCommand = this.changeList()
        const { indent, outdent } = getWwCommands()

        const taskListCommand = toggleTask()

        return {
            'Mod-u': bulletListCommand,
            'Mod-U': bulletListCommand,
            'Shift-Mod-u': taskListCommand,
            'Shift-Mod-U': taskListCommand,
            'Tab': indent(),
            'Shift-Tab': outdent()
        }
    }
}
