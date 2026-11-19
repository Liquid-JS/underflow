import { Mark as ProsemirrorMark, DOMOutputSpec } from 'prosemirror-model'
import { toggleMark } from 'prosemirror-commands'

import { EditorCommand } from '../../types/spec'
import { Mark } from '../../spec/mark'
import { getCustomAttrs, getDefaultCustomAttrs, getRawHTML, getRawHTMLTag } from '../helper/node'

export class Code extends Mark {
    get name() {
        return 'code'
    }

    get schema() {
        return {
            attrs: {
                rawHTML: { default: null },
                ...getDefaultCustomAttrs()
            },
            parseDOM: [
                {
                    tag: 'code',
                    getAttrs: (dom: Node | string) => {
                        const rawHTML = getRawHTML(dom)

                        return {
                            ...(rawHTML && { rawHTML })
                        }
                    }
                }
            ],
            toDOM: ({ attrs }: ProsemirrorMark): DOMOutputSpec => [getRawHTMLTag(attrs.rawHTML, ['code'], 'code'), getCustomAttrs(attrs)]
        }
    }

    commands(): EditorCommand {
        return () => (state, dispatch) => toggleMark(state.schema.marks.code)(state, dispatch)
    }

    keymaps() {
        const codeCommand = this.commands()()

        return {
            'Shift-Mod-c': codeCommand,
            'Shift-Mod-C': codeCommand
        }
    }
}
