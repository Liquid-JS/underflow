import { Mark as ProsemirrorMark, DOMOutputSpec } from 'prosemirror-model'
import { toggleMark } from 'prosemirror-commands'

import { EditorCommand } from '../../types/spec'
import { Mark } from '../../spec/mark'
import { getCustomAttrs, getDefaultCustomAttrs } from '../helper/node'

export class Strike extends Mark {
    get name() {
        return 'strike'
    }

    get schema() {
        const parseDOM = ['s', 'del'].map((tag) => ({
            tag,
            getAttrs: (dom: Node | string) => {
                const rawHTML = (dom as HTMLElement).getAttribute('data-raw-html')

                return {
                    ...(rawHTML && { rawHTML })
                }
            }
        }))

        return {
            attrs: {
                rawHTML: { default: null },
                ...getDefaultCustomAttrs()
            },
            parseDOM,
            toDOM: ({ attrs }: ProsemirrorMark): DOMOutputSpec => [attrs.rawHTML || 'del', getCustomAttrs(attrs)]
        }
    }

    commands(): EditorCommand {
        return () => (state, dispatch) => toggleMark(state.schema.marks.strike)(state, dispatch)
    }

    keymaps() {
        const strikeCommand = this.commands()()

        return {
            'Mod-s': strikeCommand,
            'Mod-S': strikeCommand
        }
    }
}
