import { Plugin } from 'prosemirror-state'
import { cls } from '../utils/dom'

export interface ReadonlyState {
    readonly: boolean
}

/**
 * While the editor is read-only the user can't change the text, which can still be focused, read, selected
 * and copied, as in a read-only field; the API still changes it. ProseMirror doesn't run its editing handlers
 * then, and the editor's own handlers that change the document check `view.editable`.
 */
export function readonly(state: ReadonlyState) {
    return new Plugin({
        props: {
            editable: () => !state.readonly,
            attributes: (): Record<string, string> =>
                state.readonly ? { 'class': cls('readonly'), 'aria-readonly': 'true', 'tabindex': '0' } : {},
            handleDOMEvents: {
                // WebKit goes back in the history on Backspace in text that isn't editable, unlike in a field
                keydown: (_, ev) => {
                    if (state.readonly && ev.key === 'Backspace') {
                        ev.preventDefault()
                    }

                    return false
                }
            }
        }
    })
}
