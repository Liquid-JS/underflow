import { Plugin } from 'prosemirror-state'
import { Context } from '../types/spec'
import { emitImageBlobHook } from '../helper/image'

/**
 * Dropped image files go to the `addImageBlobHook`. Other drops are left to ProseMirror rather than the browser,
 * whose `contenteditable` handling inserts dragged images as they are in Firefox.
 */
export function dropImage({ eventEmitter }: Context) {
    return new Plugin({
        props: {
            handleDOMEvents: {
                drop: (_, ev) => {
                    const files = Array.from((ev as DragEvent).dataTransfer?.files ?? [])
                    const image = files.find(({ type }) => type.startsWith('image'))

                    if (!image) {
                        return false
                    }

                    ev.preventDefault()
                    ev.stopPropagation()
                    emitImageBlobHook(eventEmitter, image, ev.type)

                    return true
                }
            }
        }
    })
}
