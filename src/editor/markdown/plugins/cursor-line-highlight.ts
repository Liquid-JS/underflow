import { EditorState, Plugin } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { cls } from '../../utils/dom'

const CURSOR_LINE_CLASS_NAME = cls('md-cursor-line')

function createDecorations({ doc, selection }: EditorState) {
    const { index, offset } = doc.content.findIndex(selection.from)
    const line = doc.maybeChild(index)

    return line
        ? DecorationSet.create(doc, [
            Decoration.node(offset, offset + line.nodeSize, { class: CURSOR_LINE_CLASS_NAME })
        ])
        : DecorationSet.empty
}

export function cursorLineHighlight() {
    return new Plugin({
        state: {
            init: (_, state) => createDecorations(state),
            apply: (tr, decorations, oldState, newState) => {
                if (tr.docChanged || !oldState.selection.eq(newState.selection)) {
                    return createDecorations(newState)
                }
                return decorations
            }
        },
        props: {
            decorations(state) {
                return this.getState(state)
            }
        }
    })
}
