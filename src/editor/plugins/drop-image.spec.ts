import { EditorView } from 'prosemirror-view'
import { EventEmitter } from '../event/event-emitter'
import { Context } from '../types/spec'
import { dropImage } from './drop-image'

describe('dropImage', () => {
    let emitter: EventEmitter
    let blobs: File[]

    function drop(files: File[], editable = true) {
        const plugin = dropImage({ eventEmitter: emitter } as unknown as Context)
        const ev = new Event('drop', { cancelable: true }) as DragEvent

        Object.defineProperty(ev, 'dataTransfer', { value: { files } })

        const handled = plugin.props.handleDOMEvents!.drop!.call(plugin, { editable } as EditorView, ev)

        return { handled, prevented: ev.defaultPrevented }
    }

    beforeEach(() => {
        emitter = new EventEmitter()
        blobs = []
        emitter.listen('addImageBlobHook', (blob: File) => {
            blobs.push(blob)
        })
    })

    it('should pass the first dropped image to the hook', () => {
        const text = new File(['a'], 'a.txt', { type: 'text/plain' })
        const image = new File(['b'], 'b.png', { type: 'image/png' })

        expect(drop([text, image])).toEqual({ handled: true, prevented: true })
        expect(blobs).toEqual([image])
    })

    it('should leave images dropped on a read-only editor', () => {
        const image = new File(['b'], 'b.png', { type: 'image/png' })

        expect(drop([image], false)).toEqual({ handled: false, prevented: false })
        expect(blobs).toEqual([])
    })

    // claiming other drops would leave them to the browser, which Firefox uses to insert dragged images
    it('should leave drops without an image file to ProseMirror', () => {
        expect(drop([])).toEqual({ handled: false, prevented: false })
        expect(drop([new File(['a'], 'a.txt', { type: 'text/plain' })])).toEqual({
            handled: false,
            prevented: false
        })
        expect(blobs).toEqual([])
    })
})
