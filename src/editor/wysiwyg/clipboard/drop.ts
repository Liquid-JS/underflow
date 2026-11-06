import { Slice } from 'prosemirror-model'
import { TextSelection } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { isInTableNode } from '../helper/node'

/**
 * Drops content the way paste inserts it: blocks dropped on an empty paragraph replace it, where
 * ProseMirror would add them next to it. A drop with nothing left to insert (its images went to the
 * `addImageBlobHook`) puts the cursor where it was dropped, for the images to go there.
 */
export function dropOnEmptyBlock(view: EditorView, ev: DragEvent, slice: Slice, moved: boolean) {
    const target = view.posAtCoords({ left: ev.clientX, top: ev.clientY })

    if (!target) {
        return false
    }

    const { state } = view
    const $target = state.doc.resolve(target.pos)

    if (!slice.size) {
        if (!moved) {
            view.dispatch(state.tr.setSelection(TextSelection.near($target)))
        }

        return true
    }

    const block = $target.parent

    if (
        !block.isTextblock ||
    block.content.size ||
    slice.openStart > 0 ||
    isInTableNode($target)
    ) {
        return false
    }

    const { tr } = state

    if (moved) {
        tr.deleteSelection()
    }

    const from = tr.mapping.map($target.before())
    const to = tr.mapping.map($target.after())

    tr.replaceRange(from, to, slice)

    let end = tr.mapping.map(to)

    tr.mapping.maps[tr.mapping.maps.length - 1].forEach((_from, _to, _newFrom, newTo) => {
        end = newTo
    })
    tr.setSelection(TextSelection.between(tr.doc.resolve(from), tr.doc.resolve(end)))

    view.focus()
    view.dispatch(tr.setMeta('uiEvent', 'drop'))

    return true
}
