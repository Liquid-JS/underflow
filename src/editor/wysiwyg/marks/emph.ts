import { Mark as ProsemirrorMark, DOMOutputSpec } from 'prosemirror-model'
import { toggleMark } from 'prosemirror-commands'

import { EditorCommand } from '../../types/spec'
import { Mark } from '../../spec/mark'
import { getCustomAttrs, getDefaultCustomAttrs, getRawHTML, getRawHTMLTag } from '../helper/node'

export class Emph extends Mark {
    get name() {
        return 'emph'
    }

    get schema() {
        const parseDOM = ['i', 'em'].map((tag) => ({
            tag,
            getAttrs: (dom: Node | string) => {
                const rawHTML = getRawHTML(dom)

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
            toDOM: ({ attrs }: ProsemirrorMark): DOMOutputSpec => [getRawHTMLTag(attrs.rawHTML, ['i', 'em'], 'em'), getCustomAttrs(attrs)]
        }
    }

    private italic(): EditorCommand {
        return () => (state, dispatch) => toggleMark(state.schema.marks.emph)(state, dispatch)
    }

    commands() {
        return { italic: this.italic() }
    }

    keymaps() {
        const italicCommand = this.italic()()

        return {
            'Mod-i': italicCommand,
            'Mod-I': italicCommand
        }
    }
}
