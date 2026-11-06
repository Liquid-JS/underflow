import { Parser } from './blocks'
import { taskListItemFinalize } from './gfm/task-list-item'
import {
    table,
    tableHead,
    tableBody,
    tableRow,
    tableCell,
    tableDelimRow,
    tableDelimCell
} from './gfm/table-block-handler'
import { customBlock } from './custom/custom-block-handler'
import { ListNode, BlockNode, CodeBlockNode, HtmlBlockNode } from './node'
import {
    peek,
    isBlank,
    isSpaceOrTab,
    endsWithBlankLine,
    reClosingCodeFence,
    CODE_INDENT,
    C_OPEN_BRACKET,
    C_GREATERTHAN
} from './block-helper'
import { unescapeString } from './common'

export const enum Process {
    Go = 0,
    Stop = 1,
    Finished = 2
}

// 'finalize' is run when the block is closed.
// 'continue' is run to check whether the block is continuing
// at a certain line and offset (e.g. whether a block quote
// contains a `>`.  It returns 0 for matched, 1 for not matched,
// and 2 for "we've dealt with this line completely, go to next."
export interface BlockHandler {
    continue(parser: Parser, container: BlockNode): Process
    finalize(parser: Parser, block: BlockNode): void
    canContain(type: string): boolean
    acceptsLines: boolean
}

const noop: BlockHandler = {
    continue: () => Process.Stop,
    finalize: () => {},
    canContain: () => false,
    acceptsLines: true
}

const document: BlockHandler = {
    continue: () => Process.Go,
    finalize: () => {},
    canContain: (t) => t !== 'item',
    acceptsLines: false
}

const list: BlockHandler = {
    continue: () => Process.Go,
    finalize: (_, block: ListNode) => {
        let listItem = block.firstChild as BlockNode
        while (listItem) {
            // check for non-final list item ending with blank line:
            if (listItem.next && endsWithBlankLine(listItem)) {
                block.listData!.tight = false
                break
            }
            // recurse into children of list item, to see if there are
            // spaces between any of them:
            let subitem = listItem.firstChild as BlockNode
            while (subitem) {
                if (subitem.next && endsWithBlankLine(subitem)) {
                    block.listData!.tight = false
                    break
                }
                subitem = subitem.next as BlockNode
            }
            listItem = listItem.next as BlockNode
        }
        // end at the last item rather than at the blank lines after it
        block.sourcepos![1] = block.lastChild!.sourcepos![1]
    },
    canContain: (t) => t === 'item',
    acceptsLines: false
}

const blockQuote: BlockHandler = {
    continue: (parser) => {
        const ln = parser.currentLine
        if (!parser.indented && peek(ln, parser.nextNonspace) === C_GREATERTHAN) {
            parser.advanceNextNonspace()
            parser.advanceOffset(1, false)
            if (isSpaceOrTab(peek(ln, parser.offset))) {
                parser.advanceOffset(1, true)
            }
        } else {
            return Process.Stop
        }
        return Process.Go
    },
    finalize: () => {},
    canContain: (t) => t !== 'item',
    acceptsLines: false
}

const item: BlockHandler = {
    continue: (parser, container: ListNode) => {
        if (parser.indent >= container.listData!.markerOffset + container.listData!.padding) {
            parser.advanceOffset(container.listData!.markerOffset + container.listData!.padding, true)
        } else if (parser.blank && container.firstChild !== null) {
            // Blank line continues the list item even without the
            // required indent, except after an empty list item.
            parser.advanceNextNonspace()
        } else {
            return Process.Stop
        }
        return Process.Go
    },
    finalize: (parser, block: ListNode) => {
        taskListItemFinalize(parser, block)

        // end at the last child rather than at the blank lines after it
        if (block.lastChild) {
            block.sourcepos![1] = block.lastChild.sourcepos![1]
        } else {
            // an empty list item ends at its marker
            block.sourcepos![1] = [
                block.sourcepos![0][0],
                block.listData!.markerOffset + block.listData!.padding
            ]
        }
    },
    canContain: (t) => t !== 'item',
    acceptsLines: false
}

const heading: BlockHandler = {
    continue: () =>
    // a heading can never container > 1 line, so fail to match:
        Process.Stop
    ,
    finalize: () => {},
    canContain: () => false,
    acceptsLines: false
}

const thematicBreak: BlockHandler = {
    continue: () =>
    // a thematic break can never container > 1 line, so fail to match:
        Process.Stop
    ,
    finalize: () => {},
    canContain: () => false,
    acceptsLines: false
}

const codeBlock: BlockHandler = {
    continue: (parser, container: CodeBlockNode) => {
        const ln = parser.currentLine
        const indent = parser.indent
        if (container.isFenced) {
            // fenced
            const match =
                indent <= 3 &&
        ln.charAt(parser.nextNonspace) === container.fenceChar &&
        ln.slice(parser.nextNonspace).match(reClosingCodeFence)
            if (match && match[0].length >= container.fenceLength) {
                // closing fence - we're at end of line, so we can return
                parser.lastLineLength = parser.offset + indent + match[0].length
                parser.finalize(container as BlockNode, parser.lineNumber)
                return Process.Finished
            }
            // skip optional spaces of fence offset
            let i = container.fenceOffset
            while (i > 0 && isSpaceOrTab(peek(ln, parser.offset))) {
                parser.advanceOffset(1, true)
                i--
            }
        } else {
            // indented
            if (indent >= CODE_INDENT) {
                parser.advanceOffset(CODE_INDENT, true)
            } else if (parser.blank) {
                parser.advanceNextNonspace()
            } else {
                return Process.Stop
            }
        }
        return Process.Go
    },
    finalize: (_, block: CodeBlockNode) => {
        if (block.stringContent === null) {
            return
        }
        if (block.isFenced) {
            // fenced
            // first line becomes info string
            const content = block.stringContent
            const newlinePos = content.indexOf('\n')
            const firstLine = content.slice(0, newlinePos)
            const rest = content.slice(newlinePos + 1)
            const infoString = firstLine.match(/^(\s*)(.*)/)
            block.infoPadding = infoString![1].length
            block.info = unescapeString(infoString![2]).trim()
            block.literal = rest
        } else {
            // indented: trailing blank lines aren't part of the code block, so it
            // ends at its last line of code (an indented code block can't be empty)
            const lines = block.stringContent.split('\n')
            while (/^[ \t]*$/.test(lines[lines.length - 1])) {
                lines.pop()
            }
            block.literal = `${lines.join('\n')}\n`
            block.sourcepos![1] = [
                block.sourcepos![0][0] + lines.length - 1,
                block.sourcepos![0][1] + lines[lines.length - 1].length - 1
            ]
        }
        block.stringContent = null // allow GC
    },
    canContain: () => false,
    acceptsLines: true
}

const htmlBlock: BlockHandler = {
    continue: (parser, container: HtmlBlockNode) => parser.blank && (container.htmlBlockType === 6 || container.htmlBlockType === 7)
        ? Process.Stop
        : Process.Go,
    finalize: (_, block) => {
        block.literal = block.stringContent?.replace(/\n$/, '') || null
        block.stringContent = null // allow GC
    },
    canContain: () => false,
    acceptsLines: true
}

const paragraph: BlockHandler = {
    continue: (parser) => parser.blank ? Process.Stop : Process.Go,
    finalize: (parser, block) => {
        if (block.stringContent === null) {
            return
        }

        let pos: number
        let hasReferenceDefs = false

        // try parsing the beginning as link reference definitions:
        while (
            peek(block.stringContent, 0) === C_OPEN_BRACKET &&
      (pos = parser.inlineParser.parseReference(block, parser.refMap))
        ) {
            block.stringContent = block.stringContent.slice(pos)
            hasReferenceDefs = true
        }
        // A paragraph can also be left empty when a setext heading underline
        // consumed the link reference definitions it consisted of (the
        // underline then started a thematic break instead, see seTextHeading).
        if ((hasReferenceDefs || block.stringContent === '') && isBlank(block.stringContent)) {
            block.unlink()
        }
    },
    canContain: () => false,
    acceptsLines: true
}

const refDef = noop
const frontMatter = noop

export const blockHandlers = {
    document,
    list,
    blockQuote,
    item,
    heading,
    thematicBreak,
    codeBlock,
    htmlBlock,
    paragraph,
    table,
    tableBody,
    tableHead,
    tableRow,
    tableCell,
    tableDelimRow,
    tableDelimCell,
    refDef,
    customBlock,
    frontMatter
}
