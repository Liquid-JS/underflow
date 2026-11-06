import { DOMOutputSpec } from 'prosemirror-model'
import { exitCode } from 'prosemirror-commands'

import { EditorCommand } from '../../types/spec'
import { NodeSchema } from '../../spec/node'

export class FrontMatter extends NodeSchema {
    get name() {
        return 'frontMatter'
    }

    get schema() {
        return {
            content: 'text*',
            group: 'block',
            code: true,
            defining: true,
            parseDOM: [
                {
                    preserveWhitespace: 'full' as const,
                    tag: 'div[data-front-matter]'
                }
            ],
            toDOM: (): DOMOutputSpec => ['div', { 'data-front-matter': 'true' }, 0]
        }
    }

    commands(): EditorCommand {
        return () => (state, dispatch, view) => {
            const { $from } = state.selection

            if (view!.endOfTextblock('down') && $from.node().type.name === 'frontMatter') {
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
