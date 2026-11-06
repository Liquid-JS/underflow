import { Node as ProsemirrorNode } from 'prosemirror-model'

import {
    ToMdNodeTypeWriterMap,
    ToMdConvertorState,
    NodeInfo,
    ToMdConvertorReturnValues
} from '../../types/convertor'
import { WwNodeType, ColumnAlign } from '../../types/wysiwyg'
import { escapeTextForLink } from '../../utils/common'

function convertToRawHTMLHavingInlines(
    state: ToMdConvertorState,
    node: ProsemirrorNode,
    [openTag, closeTag]: string[]
) {
    state.write(openTag)
    state.convertInline(node)
    state.write(closeTag)
}

function convertToRawHTMLHavingBlocks(
    state: ToMdConvertorState,
    { node, parent }: NodeInfo,
    [openTag, closeTag]: string[]
) {
    state.stopNewline = true
    state.write(openTag)
    state.convertNode(node)
    state.write(closeTag)

    if (parent?.type.name === 'doc') {
        state.closeBlock(node)
        state.stopNewline = false
    }
}

function createTableHeadDelim(textContent: string, columnAlign: ColumnAlign) {
    let textLen = textContent.length
    let leftDelim = ''
    let rightDelim = ''

    if (columnAlign === 'left') {
        leftDelim = ':'
        textLen -= 1
    } else if (columnAlign === 'right') {
        rightDelim = ':'
        textLen -= 1
    } else if (columnAlign === 'center') {
        leftDelim = ':'
        rightDelim = ':'
        textLen -= 2
    }

    return `${leftDelim}${'-'.repeat(Math.max(textLen, 3))}${rightDelim}`
}

/** A paragraph without content: an empty line in WYSIWYG (trailing hard breaks aren't written). */
function isEmptyLine(node: ProsemirrorNode) {
    if (node.type.name !== 'paragraph') {
        return false
    }

    let empty = true

    node.forEach((child) => {
        empty &&= child.type.name === 'hardBreak'
    })

    return empty
}

/** Whether a paragraph with content follows the paragraph at `index`, after nothing but empty lines. */
function isFollowedByText(parent: ProsemirrorNode, index: number) {
    for (let i = index + 1; i < parent.childCount; i += 1) {
        const child = parent.child(i)

        if (child.type.name !== 'paragraph') {
            return false
        }
        if (!isEmptyLine(child)) {
            return true
        }
    }

    return false
}

export const nodeTypeWriters: ToMdNodeTypeWriterMap = {
    text: (state, { node }) => {
        const text = node.text ?? ''
        const inLink = (node.marks || []).some((mark) => mark.type.name === 'link')
        const writeText = (part: string) =>
            inLink ? state.text(escapeTextForLink(part), false) : state.text(part)
        const cursorOffset = state.getCursorOffset(node)

        if (cursorOffset === null) {
            writeText(text)
        } else {
            // the cursor is in this text: map it between the parts before and after it
            writeText(text.slice(0, cursorOffset))
            state.mapCursor()
            writeText(text.slice(cursorOffset))
        }
    },

    hardBreak: (state, { parent, index = 0 }) => {
    // a hard break can't end a paragraph in markdown, so trailing ones are left out
        for (let i = index + 1; i < parent!.childCount; i += 1) {
            if (parent!.child(i).type.name !== 'hardBreak') {
                // a table cell can't span lines, so it keeps the HTML tag
                state.write(state.inTable ? '<br>' : '\\\n')
                return
            }
        }
    },

    paragraph: (state, { node, parent, index = 0 }) => {
        if (state.stopNewline) {
            state.convertInline(node)
        } else {
            const firstChildNode = index === 0
            const prevNode = !firstChildNode && parent!.child(index - 1)
            const prevEmptyNode = prevNode && isEmptyLine(prevNode)
            const nextNode = index < parent!.childCount - 1 && parent!.child(index + 1)
            const emptyNode = isEmptyLine(node)
            // the lines of a paragraph in a tight list item; in a loose one, paragraphs are separated as
            // at the document level
            const inListItem = parent?.type.name === 'listItem' && state.tightListItem

            if (emptyNode) {
                // Markdown has no empty lines: an empty line is written as a line holding just a backslash
                // (a hard line break) at the start of the paragraph that follows it. Empty lines that no
                // paragraph text follows, at the end of the document or a list item, can't be written.
                // At the document and block quote level, the first empty line after a paragraph is the
                // blank line that ends the paragraph.
                const endsParagraph = !inListItem && prevNode && prevNode.type.name === 'paragraph' && !prevEmptyNode

                // (the paragraph before it already ended its block, which leaves the blank line)
                if (!endsParagraph && isFollowedByText(parent!, index)) {
                    state.write('\\\n')
                }
            } else {
                state.convertInline(node)

                // The next line of the paragraph. In a tight list item, empty lines also continue the
                // paragraph, unless no text follows them; elsewhere an empty line ends the paragraph.
                const nextLine = inListItem
                    ? isFollowedByText(parent!, index)
                    : nextNode && nextNode.type.name === 'paragraph' && !isEmptyLine(nextNode)

                if (nextLine) {
                    state.write('\n')
                } else {
                    state.closeBlock(node)
                }
            }
        }
    },

    heading: (state, { node }, { delim }) => {
        const { headingType } = node.attrs

        if (headingType === 'atx') {
            state.write(`${delim} `)
            state.convertInline(node)
            state.closeBlock(node)
        } else {
            state.convertInline(node)
            state.ensureNewLine()
            state.write(delim as string)
            state.closeBlock(node)
        }
    },

    codeBlock: (state, { node }, { delim, text }) => {
        const [openDelim, closeDelim] = delim as string[]

        state.write(openDelim)
        state.ensureNewLine()
        state.text(text!, false)
        state.ensureNewLine()
        state.write(closeDelim)
        state.closeBlock(node)
    },

    blockQuote: (state, { node, parent }, { delim }) => {
        if (parent?.type.name === node.type.name) {
            state.flushClose(1)
        }

        state.wrapBlock(delim as string, null, node, () => {
            const { tightListItem } = state

            // the blocks of a quote are separated as usual, even in a tight list item
            state.tightListItem = false
            state.convertNode(node)
            state.tightListItem = tightListItem
        })
    },

    bulletList: (state, { node }, { delim }) => {
    // soft-tab(4)
        state.convertList(node, ' '.repeat(4), () => `${delim} `)
    },

    orderedList: (state, { node }) => {
        const start = node.attrs.order || 1

        // soft-tab(4)
        state.convertList(node, ' '.repeat(4), (index: number) => {
            const orderedNum = String(start + index)

            return `${orderedNum}. `
        })
    },

    listItem: (state, { node }) => {
        const { task, checked } = node.attrs

        if (task) {
            state.write(`[${checked ? 'x' : ' '}] `)
        }

        state.convertNode(node)
    },

    image: (state, _, { attrs }) => {
        const title = attrs?.title ? ` ${attrs.title}` : ''

        state.write(`![${attrs?.altText}](${attrs?.imageUrl}${title})`)
    },

    thematicBreak: (state, { node }, { delim }) => {
        state.write(delim as string)
        state.closeBlock(node)
    },

    table: (state, { node }) => {
        state.convertNode(node)
        state.closeBlock(node)
    },

    tableHead: (state, { node }, { delim }) => {
        const row = node.firstChild

        state.convertNode(node)

        let result = delim ?? ''

        if (!delim && row) {
            row.forEach(({ textContent, attrs }) => {
                const headDelim = createTableHeadDelim(textContent, attrs.align)

                result += `| ${headDelim} `
            })
        }

        state.write(`${result}|`)
        state.ensureNewLine()
    },

    tableBody: (state, { node }) => {
        state.convertNode(node)
    },

    tableRow: (state, { node }) => {
    // the body of a table with only a header row holds a row without cells
        if (!node.childCount) {
            return
        }

        state.convertNode(node)
        state.write('|')
        state.ensureNewLine()
    },

    tableHeadCell: (state, { node }, { delim = '| ' }) => {
        state.write(delim as string)
        state.convertTableCell(node)
        state.write(' ')
    },

    tableBodyCell: (state, { node }, { delim = '| ' }) => {
        state.write(delim as string)
        state.convertTableCell(node)
        state.write(' ')
    },

    customBlock: (state, { node }, { delim, text }) => {
        const [openDelim, closeDelim] = delim as string[]

        state.write(openDelim)
        state.ensureNewLine()
        state.text(text!, false)
        state.ensureNewLine()
        state.write(closeDelim)
        state.closeBlock(node)
    },

    frontMatter: (state, { node }, { text }) => {
        state.text(text!, false)
        state.closeBlock(node)
    },

    widget: (state, _, { text }) => {
        state.write(text)
    },

    html: (state, { node }, { text }) => {
        state.write(text)

        if (node.attrs.htmlBlock) {
            state.closeBlock(node)
        }
    },

    htmlSource: (state, { node }, { text }) => {
        state.write(text)
        state.closeBlock(node)
    }
}

export function write(
    type: WwNodeType,
    {
        state,
        nodeInfo,
        params
    }: {
        state: ToMdConvertorState
        nodeInfo: NodeInfo
        params: ToMdConvertorReturnValues
    }
) {
    const { rawHTML } = params

    if (rawHTML) {
        if (['heading', 'codeBlock'].includes(type)) {
            convertToRawHTMLHavingInlines(state, nodeInfo.node, rawHTML as string[])
        } else if (['image', 'thematicBreak'].includes(type)) {
            state.write(rawHTML as string)
        } else {
            convertToRawHTMLHavingBlocks(state, nodeInfo, rawHTML as string[])
        }
    } else {
        nodeTypeWriters[type]!(state, nodeInfo, params)
    }
}
