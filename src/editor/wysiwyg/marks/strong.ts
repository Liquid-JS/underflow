import { Mark as ProsemirrorMark, DOMOutputSpec } from 'prosemirror-model'
import { toggleMark } from 'prosemirror-commands'

import { EditorCommand } from '../../types/spec'
import { Mark } from '../../spec/mark'
import { getCustomAttrs, getDefaultCustomAttrs, getRawHTML, getRawHTMLTag } from '../helper/node'

export class Strong extends Mark {
    get name() {
        return 'strong'
    }

    get schema() {
        const parseDOM = ['b', 'strong'].map((tag) => ({
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
            toDOM: ({ attrs }: ProsemirrorMark): DOMOutputSpec => [getRawHTMLTag(attrs.rawHTML, ['b', 'strong'], 'strong'), getCustomAttrs(attrs)]
        }
    }

    private bold(): EditorCommand {
        return () => (state, dispatch) => toggleMark(state.schema.marks.strong)(state, dispatch)
    }

    commands() {
        return { bold: this.bold() }
    }

    keymaps() {
        const boldCommand = this.bold()()

        return {
            'Mod-b': boldCommand,
            'Mod-B': boldCommand
        }
    }
}
