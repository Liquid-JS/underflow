import type { NodeSpec, MarkSpec, Schema } from 'prosemirror-model'

import { ToWwConvertorMap, ToWwConvertorState } from '../../types/convertor'
import { isElemNode } from '../../utils/dom'
import { getWidgetText, isWidgetMdNode } from '../../widget/rules'
import { getChildrenHTML, getHTMLAttrsByHTMLString } from '../../wysiwyg/nodes/html'
import { reBR, reHTMLTag, reHTMLComment } from '../../utils/constants'
import { sanitizeHTML } from '../../sanitizer/html-sanitizer'
import {
    htmlToWwConvertors,
    getTextWithoutTrailingNewline,
    isListNode
} from './html-to-ww-convertors'
import {
    MdNode,
    HeadingMdNode,
    CodeBlockMdNode,
    ListItemMdNode,
    LinkMdNode,
    TableCellMdNode,
    CustomBlockMdNode,
    TableMdNode,
    HTMLConvertorMap,
    OpenTagToken,
    Renderer
} from '@liquid-js/underflow/parser'

function isBRTag(node: MdNode) {
    return node.type === 'htmlInline' && reBR.test(node.literal!)
}

function isInHeading(node: MdNode) {
    let { parent } = node

    while (parent && parent.type !== 'heading' && parent.type !== 'paragraph') {
        ({ parent } = parent)
    }

    return parent?.type === 'heading'
}

/** Whether only empty lines (hard breaks at the start of a line) precede a hard break on its line. */
function isAtLineStart(node: MdNode) {
    let { prev } = node

    while (prev && prev.type === 'linebreak') {
        ({ prev } = prev)
    }

    return !prev || prev.type === 'softbreak'
}

// attributes the WYSIWYG nodes keep, by tag; any other attribute would be lost
const keptHTMLAttributes: Record<string, string[]> = {
    img: ['src', 'alt', 'title'],
    a: ['href', 'title'],
    th: ['align'],
    td: ['align'],
    ol: ['start'],
    li: ['class', 'data-task', 'data-task-checked']
}

// an opening inline tag kept as source: its closing tag is kept as source too
const inlineSourceTags = new WeakMap<ToWwConvertorState, string[]>()

const supportedTagsCache = new WeakMap<Schema, Set<string>>()

/** The tags the schema parses into nodes or marks without needing classes or data attributes. */
function getSupportedTags(schema: Schema) {
    let tags = supportedTagsCache.get(schema)

    if (!tags) {
        const supported = new Set<string>()
        const specs: Array<NodeSpec | MarkSpec> = [
            ...Object.values(schema.nodes).map(({ spec }) => spec),
            ...Object.values(schema.marks).map(({ spec }) => spec)
        ]

        specs.forEach((spec) => {
            (spec.parseDOM ?? []).forEach(({ tag }: { tag?: string }) => {
                const [, name, attributes = ''] = tag?.match(/^([a-z][a-z0-9]*)((?:\[[a-z-]+\])*)$/) ?? []

                if (name && !attributes.includes('[data-')) {
                    supported.add(name)
                }
            })
        })
        tags = supported
        supportedTagsCache.set(schema, tags)
    }

    return tags
}

function describeElements(html: string) {
    const template = document.createElement('template')

    // a template's content is inert: nothing in it loads or runs
    template.innerHTML = html

    return Array.from(template.content.querySelectorAll('*'))
}

/**
 * Whether WYSIWYG can show the HTML without losing anything: every element has a node or a mark,
 * only with the attributes those keep, and the sanitizer removes nothing.
 */
function isConvertibleHTML(html: string, schema: Schema) {
    const elements = describeElements(html)
    const supportedTags = getSupportedTags(schema)
    const signature = (els: Element[]) =>
        els.map((el) => `${el.localName}[${el.getAttributeNames().sort().join()}]`).join(' ')

    const isKept = (el: Element) => {
        const keptAttributes = keptHTMLAttributes[el.localName] ?? []

        return (
            supportedTags.has(el.localName) &&
      el.getAttributeNames().every((name) => keptAttributes.includes(name))
        )
    }

    const sanitized = describeElements(sanitizeHTML(html))

    return elements.every(isKept) && signature(elements) === signature(sanitized)
}

function addHTMLSource(state: ToWwConvertorState, html: string) {
    state.openNode(state.schema.nodes.htmlSource)
    state.addText(getTextWithoutTrailingNewline(html))
    state.closeNode()
}

function addRawHTMLAttributeToDOM(parent: Node) {
    Array.from(parent.childNodes).forEach((child) => {
        if (isElemNode(child)) {
            const openTagName = child.nodeName.toLowerCase();

            (child as HTMLElement).setAttribute('data-raw-html', openTagName)

            if (child.childNodes) {
                addRawHTMLAttributeToDOM(child)
            }
        }
    })
}

// the wysiwyg table always has a head row, so use the first row of an html table without <thead>
function addTableHeadToDOM(parent: Element) {
    Array.from(parent.querySelectorAll('table')).forEach((table) => {
        if (!table.tHead && table.rows.length > 1) {
            const [firstRow] = Array.from(table.rows)
            const section = firstRow.parentElement!

            table.createTHead().appendChild(firstRow)

            if (!section.children.length) {
                table.removeChild(section)
            }
        }
    })
}

const toWwConvertors: ToWwConvertorMap = {
    text: (state, node) => {
        state.addText(node.literal || '')
    },

    paragraph: (state, node, { entering }, customAttrs) => {
        if (entering) {
            const { paragraph } = state.schema.nodes

            // The `\n\n` entered in markdown separates the paragraph.
            // When changing to wysiwyg, a newline is added between the two paragraphs.
            if (node.prev?.type === 'paragraph') {
                state.openNode(paragraph, customAttrs)
                state.closeNode()
            }

            state.openNode(paragraph, customAttrs)
        } else {
            state.closeNode()
        }
    },

    heading: (state, node, { entering }, customAttrs) => {
        if (entering) {
            const { level, headingType } = node as HeadingMdNode

            state.openNode(state.schema.nodes.heading, { level, headingType, ...customAttrs })
        } else {
            state.closeNode()
        }
    },

    codeBlock: (state, node, customAttrs) => {
        const { codeBlock } = state.schema.nodes
        const { info, literal } = node as CodeBlockMdNode

        state.openNode(codeBlock, { language: info, ...customAttrs })
        state.addText(getTextWithoutTrailingNewline(literal || ''))
        state.closeNode()
    },

    list: (state, node, { entering }, customAttrs) => {
        if (entering) {
            const { bulletList, orderedList } = state.schema.nodes
            const { type, start, tight } = (node as ListItemMdNode).listData

            if (type === 'bullet') {
                state.openNode(bulletList, { tight, ...customAttrs })
            } else {
                state.openNode(orderedList, { order: start, tight, ...customAttrs })
            }
        } else {
            state.closeNode()
        }
    },

    item: (state, node, { entering }, customAttrs) => {
        const { listItem } = state.schema.nodes
        const { task, checked } = (node as ListItemMdNode).listData

        if (entering) {
            const attrs = {
                ...(task && { task }),
                ...(checked && { checked }),
                ...customAttrs
            }

            state.openNode(listItem, attrs)
        } else {
            state.closeNode()
        }
    },

    blockQuote: (state, _, { entering }, customAttrs) => {
        if (entering) {
            state.openNode(state.schema.nodes.blockQuote, customAttrs)
        } else {
            state.closeNode()
        }
    },

    image: (state, node, { entering, skipChildren }, customAttrs) => {
        const { image } = state.schema.nodes
        const { destination, firstChild, title } = node as LinkMdNode

        if (entering && skipChildren) {
            skipChildren()
        }

        state.addNode(image, {
            imageUrl: destination,
            ...(firstChild && { altText: firstChild.literal }),
            ...(title && { title }),
            ...customAttrs
        })
    },

    thematicBreak: (state, _node, _, customAttrs) => {
        state.addNode(state.schema.nodes.thematicBreak, customAttrs)
    },

    strong: (state, _, { entering }, customAttrs) => {
        const { strong } = state.schema.marks

        if (entering) {
            state.openMark(strong.create(customAttrs))
        } else {
            state.closeMark(strong)
        }
    },

    emph: (state, _, { entering }, customAttrs) => {
        const { emph } = state.schema.marks

        if (entering) {
            state.openMark(emph.create(customAttrs))
        } else {
            state.closeMark(emph)
        }
    },

    link: (state, node, { entering }, customAttrs) => {
        const { link } = state.schema.marks
        const { destination, title } = node as LinkMdNode

        if (entering) {
            const attrs = {
                linkUrl: destination,
                title,
                ...customAttrs
            }

            state.openMark(link.create(attrs))
        } else {
            state.closeMark(link)
        }
    },

    linebreak: (state, node) => {
    // A line holding just a backslash (a hard break at the start of a line) is an empty line, the
    // way they're written from WYSIWYG; a hard break after content stays in the paragraph.
        if (node.parent!.type === 'paragraph' && isAtLineStart(node)) {
            state.closeNode()
            state.openNode(state.schema.nodes.paragraph)
        } else {
            state.addNode(state.schema.nodes.hardBreak)
        }
    },

    softbreak: (state, node) => {
    // a WYSIWYG heading is a single line, and a line ending in a heading renders as a space
        if (isInHeading(node)) {
            state.addText(' ')
        } else if (node.parent!.type === 'paragraph') {
            const { prev, next } = node

            if (prev && !isBRTag(prev)) {
                state.closeNode()
            }

            if (next && !isBRTag(next)) {
                state.openNode(state.schema.nodes.paragraph)
            }
        }
    },

    // GFM specifications node
    table: (state, _, { entering }, customAttrs) => {
        if (entering) {
            state.openNode(state.schema.nodes.table, customAttrs)
        } else {
            state.closeNode()
        }
    },

    tableHead: (state, _, { entering }, customAttrs) => {
        if (entering) {
            state.openNode(state.schema.nodes.tableHead, customAttrs)
        } else {
            state.closeNode()
        }
    },

    tableBody: (state, _, { entering }, customAttrs) => {
        if (entering) {
            state.openNode(state.schema.nodes.tableBody, customAttrs)
        } else {
            state.closeNode()
        }
    },

    tableRow: (state, _, { entering }, customAttrs) => {
        if (entering) {
            state.openNode(state.schema.nodes.tableRow, customAttrs)
        } else {
            state.closeNode()
        }
    },

    tableCell: (state, node, { entering }) => {
        if (!(node as TableCellMdNode).ignored) {
            // the list tags in the table cell open and close the paragraphs around them by themselves
            const hasParaNode = (childNode: MdNode | null) => childNode && !isListNode(childNode)

            if (entering) {
                const { tableHeadCell, tableBodyCell, paragraph } = state.schema.nodes
                const tablePart = node.parent!.parent!
                const cell = tablePart.type === 'tableHead' ? tableHeadCell : tableBodyCell

                const table = tablePart.parent as TableMdNode
                const { align } = table.columns[(node as TableCellMdNode).startIdx] || {}
                const attrs: Record<string, string | number> = { ...(node as TableCellMdNode).attrs }

                if (align) {
                    attrs.align = align
                }

                state.openNode(cell, attrs)

                if (hasParaNode(node.firstChild)) {
                    state.openNode(paragraph)
                }
            } else {
                if (hasParaNode(node.lastChild)) {
                    state.closeNode()
                }
                state.closeNode()
            }
        }
    },

    strike: (state, _, { entering }, customAttrs) => {
        const { strike } = state.schema.marks

        if (entering) {
            state.openMark(strike.create(customAttrs))
        } else {
            state.closeMark(strike)
        }
    },

    code: (state, node, _, customAttrs) => {
        const { code } = state.schema.marks

        state.openMark(code.create(customAttrs))
        state.addText(getTextWithoutTrailingNewline(node.literal || ''))
        state.closeMark(code)
    },

    customBlock: (state, node) => {
        const { customBlock, paragraph } = state.schema.nodes
        const { info, literal } = node as CustomBlockMdNode

        state.openNode(customBlock, { info })
        state.addText(getTextWithoutTrailingNewline(literal || ''))
        state.closeNode()
        // add empty line to edit the content in next line
        if (!node.next) {
            state.openNode(paragraph)
            state.closeNode()
        }
    },

    frontMatter: (state, node) => {
        state.openNode(state.schema.nodes.frontMatter)
        state.addText(node.literal!)
        state.closeNode()
    },

    htmlInline: (state, node) => {
        const html = node.literal!
        const matched = html.match(reHTMLTag)

        const { htmlInlineSource } = state.schema.marks
        const sourceTags = inlineSourceTags.get(state) ?? []

        inlineSourceTags.set(state, sourceTags)

        // processing instructions, declarations, CDATA sections and tags WYSIWYG can't show keep their source
        const addSource = () => {
            state.openMark(htmlInlineSource.create())
            state.addText(html)
            state.closeMark(htmlInlineSource)
        }

        if (!matched) {
            addSource()
            return
        }

        const [, openTagName, , closeTagName] = matched
        const typeName = (openTagName || closeTagName).toLowerCase()
        const markType = state.schema.marks[typeName]
        const sanitizedHTML = sanitizeHTML(html)

        // for user defined html schema
        if (markType?.spec.attrs!.htmlInline) {
            if (openTagName) {
                const htmlAttrs = getHTMLAttrsByHTMLString(sanitizedHTML)

                state.openMark(markType.create({ htmlAttrs }))
            } else {
                state.closeMark(markType)
            }
        } else {
            const htmlToWwConvertor = htmlToWwConvertors[typeName]

            const sourceTagIndex = closeTagName ? sourceTags.lastIndexOf(typeName) : -1

            if (sourceTagIndex !== -1) {
                sourceTags.splice(sourceTagIndex, 1)
                addSource()
            } else if (htmlToWwConvertor && isConvertibleHTML(html, state.schema)) {
                htmlToWwConvertor(state, node, openTagName)
            } else {
                if (openTagName && !/\/>$/.test(html)) {
                    sourceTags.push(typeName)
                }
                addSource()
            }
        }
    },

    htmlBlock: (state, node) => {
        const html = node.literal!
        const container = document.createElement('div')
        const isHTMLComment = reHTMLComment.test(html)

        // comments, processing instructions, declarations, CDATA sections, unfinished tags and HTML
        // that WYSIWYG can't show without losing something keep their source
        if (isHTMLComment) {
            addHTMLSource(state, html)
        } else {
            const matched = html.match(reHTMLTag)

            if (!matched) {
                addHTMLSource(state, html)
                return
            }

            const [, openTagName, , closeTagName] = matched

            const typeName = (openTagName || closeTagName).toLowerCase()
            const nodeType = state.schema.nodes[typeName]
            const sanitizedHTML = sanitizeHTML(html)

            // for user defined html schema
            if (nodeType?.spec.attrs!.htmlBlock) {
                const htmlAttrs = getHTMLAttrsByHTMLString(sanitizedHTML)
                const childrenHTML = getChildrenHTML(node, typeName)

                state.addNode(nodeType, { htmlAttrs, childrenHTML })
            } else if (!openTagName || !isConvertibleHTML(html, state.schema)) {
                // (a block holding only a closing tag, like the end of a `<details>`, has nothing to convert)
                addHTMLSource(state, html)
            } else {
                container.innerHTML = sanitizedHTML
                addTableHeadToDOM(container)
                addRawHTMLAttributeToDOM(container)

                state.convertByDOMParser(container as HTMLElement)
            }
        }
    },

    customInline: (state, node, { entering, skipChildren }) => {
    // text matching a widget rule; other custom inline nodes keep their text
        if (entering && isWidgetMdNode(node)) {
            skipChildren()
            state.addNode(state.schema.nodes.widget, {
                info: node.info,
                text: getWidgetText(node)
            })
        }
    }
}

export function createWwConvertors(customConvertors: HTMLConvertorMap) {
    const customConvertorTypes = Object.keys(customConvertors)
    const convertors = { ...toWwConvertors }
    const renderer = new Renderer({
        gfm: true,
        nodeId: true,
        convertors: customConvertors
    })
    const orgConvertors = renderer.getConvertors()

    customConvertorTypes.forEach((type) => {
        const wwConvertor = toWwConvertors[type]

        if (wwConvertor && !['htmlBlock', 'htmlInline'].includes(type)) {
            convertors[type] = (state, node, context) => {
                context.origin = () => orgConvertors[type]!(node, context, orgConvertors)
                const tokens = customConvertors[type]!(node, context) as OpenTagToken
                let attrs

                if (tokens) {
                    const { attributes: htmlAttrs, classNames } = Array.isArray(tokens) ? tokens[0] : tokens

                    attrs = { htmlAttrs, classNames }
                }

                wwConvertor(state, node, context, attrs)
            }
        }
    })

    return convertors
}
