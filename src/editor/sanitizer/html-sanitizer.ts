import DOMPurify, { type Config } from 'dompurify'
import { CustomHTMLRenderer } from '../types/editor'

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

/** Keeps the tags of custom HTML renderers in the sanitized HTML. */
export function registerHTMLTagToWhitelist(convertorMap: CustomHTMLRenderer) {
    ['htmlBlock', 'htmlInline'].forEach((htmlType) => {
        if (convertorMap[htmlType]) {
            // register tag white list for preventing to remove the html in sanitizer
            Object.keys(convertorMap[htmlType]!).forEach((type) => registerTagWhitelistIfPossible(type))
        }
    })
}
