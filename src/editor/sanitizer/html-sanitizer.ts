import DOMPurify, { type Config } from 'dompurify'

const CAN_BE_WHITE_TAG_LIST = ['iframe', 'embed']
const whiteTagList: string[] = []

export function registerTagWhitelistIfPossible(tagName: string) {
    if (CAN_BE_WHITE_TAG_LIST.includes(tagName)) {
        whiteTagList.push(tagName.toLowerCase())
    }
}

export function sanitizeHTML<T extends string | HTMLElement | DocumentFragment = string>(
    html: string | Node,
    options?: Config
) {
    return DOMPurify.sanitize(html, {
        ADD_TAGS: whiteTagList,
        ADD_ATTR: ['rel', 'target', 'hreflang', 'type'],
        FORBID_TAGS: [
            'input',
            'script',
            'textarea',
            'form',
            'button',
            'select',
            'meta',
            'style',
            'link',
            'title',
            'object',
            'base'
        ],
        ...options
    }) as unknown as T
}
