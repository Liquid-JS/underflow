import { Fragment, Node, Slice } from 'prosemirror-model'

export interface DataImage {
    file: File
    altText: string
}

const reDataImage = /^data:(image\/[\w.+-]+)((?:;[^,;]*)*),(.*)$/is

/** The image a `data:` URL holds, or null if it isn't an image or can't be decoded. */
export function dataURLToFile(url: string): File | null {
    const match = url.trim().match(reDataImage)

    if (!match) {
        return null
    }

    const [, type, params, data] = match

    try {
        const bytes = /;base64/i.test(params)
            ? Uint8Array.from(atob(data.replace(/\s/g, '')), (char) => char.charCodeAt(0))
            : new TextEncoder().encode(decodeURIComponent(data))
        const extension = type.slice('image/'.length).replace(/\+.*$/, '')

        return new File([bytes], `image.${extension}`, { type: type.toLowerCase() })
    } catch {
        return null
    }
}

function isDataImage(node: Node) {
    return node.type.name === 'image' && /^\s*data:/i.test(node.attrs.imageUrl)
}

function takeFromFragment(fragment: Fragment, images: DataImage[]): Fragment {
    const nodes: Node[] = []
    let changed = false

    fragment.forEach((node) => {
        if (isDataImage(node)) {
            const file = dataURLToFile(node.attrs.imageUrl)

            if (file) {
                images.push({ file, altText: node.attrs.altText || '' })
            }
            changed = true

            return
        }

        const content = takeFromFragment(node.content, images)

        if (content === node.content) {
            nodes.push(node)
        } else {
            changed = true
            // a block left empty by taking its images goes too
            if (content.size || !node.isTextblock) {
                nodes.push(node.copy(content))
            }
        }
    })

    return changed ? Fragment.from(nodes) : fragment
}

function openDepth(fragment: Fragment, side: 'firstChild' | 'lastChild') {
    let depth = 0

    for (let node = fragment[side]; node && !node.isLeaf; node = node.content[side]) {
        depth += 1
    }

    return depth
}

/**
 * Takes the images with a `data:` URL out of pasted or dropped content, so they can go to the
 * `addImageBlobHook` like pasted and dropped image files do, instead of into the markdown.
 */
export function takeDataImages(slice: Slice) {
    const images: DataImage[] = []
    const content = takeFromFragment(slice.content, images)

    if (content === slice.content) {
        return { slice, images }
    }
    if (!content.size) {
        return { slice: Slice.empty, images }
    }

    // taking a block at an open side can make the slice less deep there
    const openStart = Math.min(slice.openStart, openDepth(content, 'firstChild'))
    const openEnd = Math.min(slice.openEnd, openDepth(content, 'lastChild'))

    return { slice: new Slice(content, openStart, openEnd), images }
}
