import { Plugin } from 'prosemirror-state'

/**
 * Tab indents in the editor, so Escape followed by Tab or Shift-Tab moves the focus out of it instead,
 * like in code editors (WCAG 2.1.2).
 */
export function tabOut() {
    let escaped = false

    return new Plugin({
        props: {
            handleDOMEvents: {
                keydown: (_, ev) => {
                    if (ev.key === 'Shift') {
                        return false
                    }

                    const leave = escaped && ev.key === 'Tab' && !ev.ctrlKey && !ev.altKey && !ev.metaKey

                    escaped = ev.key === 'Escape'

                    // the editor doesn't handle the key, so the browser moves the focus
                    return leave
                },
                blur: () => {
                    escaped = false

                    return false
                }
            }
        }
    })
}
