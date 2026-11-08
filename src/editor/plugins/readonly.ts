import { Plugin } from 'prosemirror-state'
import { cls } from '../utils/dom'

export interface ReadonlyState {
    readonly: boolean
    disabled: boolean
}

function attributes(state: ReadonlyState): Record<string, string> {
    if (state.disabled) {
        // as a disabled field, out of the Tab order, though it can still be clicked to select and copy the text
        return { 'class': cls('disabled'), 'aria-disabled': 'true', 'tabindex': '-1' }
    }

    return state.readonly ? { 'class': cls('readonly'), 'aria-readonly': 'true', 'tabindex': '0' } : {}
}

/**
 * While the editor is read-only the user can't change the text, which can still be focused, read, selected
 * and copied, as in a read-only field; the API still changes it. ProseMirror doesn't run its editing handlers
 * then, and the editor's own handlers that change the document check `view.editable`. A disabled editor is
 * read-only too, and its text is out of the Tab order.
 */
export function readonly(state: ReadonlyState) {
    return new Plugin({
        props: {
            editable: () => !state.readonly && !state.disabled,
            attributes: () => attributes(state),
            handleDOMEvents: {
                // WebKit goes back in the history on Backspace in text that isn't editable, unlike in a field
                keydown: (_, ev) => {
                    if ((state.readonly || state.disabled) && ev.key === 'Backspace') {
                        ev.preventDefault()
                    }

                    return false
                }
            }
        }
    })
}
