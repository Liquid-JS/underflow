import {
    HTMLToWwConvertorMap,
    FlattenHTMLToWwConvertorMap,
    ToWwConvertorState
} from '../../types/convertor'
import { sanitizeHTML } from '../../sanitizer/html-sanitizer'

import { reHTMLTag } from '../../utils/constants'
import { MdNode } from '../../../parser/types/node'

export function getTextWithoutTrailingNewline(text: string) {
    return text[text.length - 1] === '\n' ? text.slice(0, text.length - 1) : text
}

export function isCustomHTMLInlineNode({ schema }: ToWwConvertorState, node: MdNode) {
    const html = node.literal!
    const matched = html.match(reHTMLTag)

    if (matched) {
        const [, openTagName, , closeTagName] = matched
        const typeName = (openTagName || closeTagName).toLowerCase()

        return node.type === 'htmlInline' && !!(schema.marks[typeName] || schema.nodes[typeName])
    }
    return false
}

export function isInlineNode({ type }: MdNode) {
    return ['text', 'strong', 'emph', 'strike', 'image', 'link', 'code'].includes(type)
}

function isSoftbreak(mdNode: MdNode | null) {
    return mdNode?.type === 'softbreak'
}

export function isListNode({ type, literal }: MdNode) {
    const matched = type === 'htmlInline' && literal!.match(reHTMLTag)

    if (matched) {
        const [, openTagName, , closeTagName] = matched
        const tagName = openTagName || closeTagName

        if (tagName) {
            return ['ul', 'ol', 'li'].includes(tagName.toLowerCase())
        }
    }

    return false
}

function getListItemAttrs({ literal }: MdNode) {
    const task = /data-task/.test(literal!)
    const checked = /data-task-checked/.test(literal!)

    return { task, checked }
}

function getMatchedAttributeValue(rawHTML: string, ...attrNames: string[]) {
    const wrapper = document.createElement('div')

    wrapper.innerHTML = sanitizeHTML(rawHTML)

    const el = wrapper.firstChild as HTMLElement

    return attrNames.map((attrName) => el.getAttribute(attrName) || '')
}

function createConvertors(convertorsByTags: HTMLToWwConvertorMap) {
    const convertorMap: FlattenHTMLToWwConvertorMap = {}

    Object.keys(convertorsByTags).forEach((key) => {
        const tagNames = key.split(', ')

        tagNames.forEach((tagName) => {
            const name = tagName.toLowerCase()

            convertorMap[name] = convertorsByTags[key]!
        })
    })

    return convertorMap
}

const convertors: HTMLToWwConvertorMap = {
    'b, strong': (state, _, openTagName) => {
        const { strong } = state.schema.marks

        if (openTagName) {
            state.openMark(strong.create({ rawHTML: openTagName }))
        } else {
            state.closeMark(strong)
        }
    },

    'i, em': (state, _, openTagName) => {
        const { emph } = state.schema.marks

        if (openTagName) {
            state.openMark(emph.create({ rawHTML: openTagName }))
        } else {
            state.closeMark(emph)
        }
    },

    's, del': (state, _, openTagName) => {
        const { strike } = state.schema.marks

        if (openTagName) {
            state.openMark(strike.create({ rawHTML: openTagName }))
        } else {
            state.closeMark(strike)
        }
    },

    'code': (state, _, openTagName) => {
        const { code } = state.schema.marks

        if (openTagName) {
            state.openMark(code.create({ rawHTML: openTagName }))
        } else {
            state.closeMark(code)
        }
    },

    'a': (state, node, openTagName) => {
        const tag = node.literal!
        const { link } = state.schema.marks

        if (openTagName) {
            const [linkUrl] = getMatchedAttributeValue(tag, 'href')

            state.openMark(
                link.create({
                    linkUrl,
                    rawHTML: openTagName
                })
            )
        } else {
            state.closeMark(link)
        }
    },

    'img': (state, node, openTagName) => {
        const tag = node.literal!

        if (openTagName) {
            const [imageUrl, altText, title] = getMatchedAttributeValue(tag, 'src', 'alt', 'title')
            const { image } = state.schema.nodes

            state.addNode(image, {
                rawHTML: openTagName,
                imageUrl,
                ...(altText && { altText }),
                ...(title && { title })
            })
        }
    },

    'hr': (state, _, openTagName) => {
        state.addNode(state.schema.nodes.thematicBreak, { rawHTML: openTagName })
    },

    'br': (state, node) => {
        const { paragraph } = state.schema.nodes
        const { parent, prev, next } = node

        if (parent?.type === 'paragraph') {
            // should open a paragraph node when line text has only <br> tag
            // ex) first line\n\n<br>\nfourth line
            if (isSoftbreak(prev)) {
                state.openNode(paragraph)
            }

            // should close a paragraph node when line text has only <br> tag
            // ex) first line\n\n<br>\nfourth line
            if (isSoftbreak(next)) {
                state.closeNode()
                // should close a paragraph node and open a paragraph node to separate between blocks
                // when <br> tag is in the middle of the paragraph
                // ex) first <br>line\nthird line
            } else if (next) {
                state.closeNode()
                state.openNode(paragraph)
            }
        } else if (parent?.type === 'tableCell') {
            // a paragraph is always open around a <br> tag in the table cell,
            // so every line (including empty ones) becomes its own paragraph
            state.closeNode()
            state.openNode(paragraph)
        }
    },

    'pre': (state, node, openTagName) => {
        const container = document.createElement('div')

        container.innerHTML = node.literal!

        const literal = container.firstChild?.firstChild?.textContent

        // a lone opening or closing tag (e.g. in a table cell) has no code to convert, keep its content as text
        if (typeof literal !== 'string') {
            return
        }

        state.openNode(state.schema.nodes.codeBlock, { rawHTML: openTagName })
        state.addText(getTextWithoutTrailingNewline(literal))
        state.closeNode()
    },

    'ul, ol': (state, node, openTagName) => {
    // in the table cell, '<ul>', '<ol>' is parsed as 'htmlInline' node
        if (node.parent!.type === 'tableCell') {
            const { bulletList, orderedList, paragraph } = state.schema.nodes
            const list = openTagName === 'ul' ? bulletList : orderedList

            if (openTagName) {
                if (node.prev && !isListNode(node.prev)) {
                    state.closeNode()
                }

                const attrs: Record<string, any> = { rawHTML: openTagName }

                if (list === orderedList) {
                    const container = document.createElement('div')

                    container.innerHTML = sanitizeHTML(node.literal!)

                    const start = Number((container.firstChild as HTMLElement | null)?.getAttribute('start'))

                    if (start) {
                        attrs.order = start
                    }
                }

                state.openNode(list, attrs)
            } else {
                state.closeNode()

                if (node.next && !isListNode(node.next)) {
                    state.openNode(paragraph)
                }
            }
        }
    },

    'li': (state, node, openTagName) => {
    // in the table cell, '<li>' is parsed as 'htmlInline' node
        if (node.parent?.type === 'tableCell') {
            const { listItem, paragraph } = state.schema.nodes

            if (openTagName) {
                const attrs = getListItemAttrs(node)

                if (node.prev && !isListNode(node.prev)) {
                    state.closeNode()
                }

                state.openNode(listItem, { rawHTML: openTagName, ...attrs })

                if (node.next && !isListNode(node.next)) {
                    state.openNode(paragraph)
                }
            } else {
                if (node.prev && !isListNode(node.prev)) {
                    state.closeNode()
                }

                state.closeNode()
            }
        }
    }
}

export const htmlToWwConvertors = createConvertors(convertors)
