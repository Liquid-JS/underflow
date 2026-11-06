import { HookCallback } from '../types/editor'
import { Emitter } from '../types/event'

export function addDefaultImageBlobHook(eventEmitter: Emitter) {
    eventEmitter.listen('addImageBlobHook', (blob: File, callback: HookCallback) => {
        const reader = new FileReader()

        reader.onload = ({ target }) => callback(target!.result as string)
        reader.readAsDataURL(blob)
    })
}

export function emitImageBlobHook(
    eventEmitter: Emitter,
    blob: File,
    type: string,
    defaultAltText?: string
) {
    const hook: HookCallback = (imageUrl, altText) => {
        eventEmitter.emit('command', 'addImage', {
            imageUrl,
            altText: altText || defaultAltText || blob.name || 'image'
        })
    }

    eventEmitter.emit('addImageBlobHook', blob, hook, type)
}

export function pasteImageOnly(items: DataTransferItemList) {
    const images = Array.from(items).filter(({ type }) => type.indexOf('image') !== -1)

    if (images.length === 1) {
        const [item] = images

        if (item) {
            return item.getAsFile()
        }
    }

    return null
}
