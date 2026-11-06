import { Plugin, Transaction } from 'prosemirror-state'
import { NodeType, Node as ProsemirrorNode, Schema } from 'prosemirror-model'
import { MdContext } from '../../types/spec'
import { getMdStartLine, getMdEndLine, getMdStartCh, getMdEndCh } from '../../utils/markdown'
import { last } from '../../utils/common'
import { getStartPosListPerLine } from '../helper/pos'
import { MdNode, Pos as MdPos } from '../../../parser/types/node'
import { EditResult } from '../../../parser/types/markdown-document'
import { MarkdownDocument } from '../../../parser/markdown-document'
import { getMarkInfo, MarkInfo } from './helper/mark-info'

interface CodeBlockPos {
    codeStart: number
    codeEnd: number
}

interface BlockPosInfo {
    from: number
    to: number
    startIndex: number
    endIndex: number
}

let removingBackgroundIndexMap: Record<number, boolean> = {}

export function syntaxHighlight({ schema, markdownDocument }: MdContext) {
    return new Plugin({
        appendTransaction: (transactions, _, newState) => {
            const [tr] = transactions
            const newTr = newState.tr

            if (tr.docChanged) {
                let markInfo: MarkInfo[] = []
                const editResult: EditResult[] = tr.getMeta('editResult')

                editResult.forEach((result) => {
                    const { nodes, removedNodeRange } = result

                    if (nodes.length) {
                        markInfo = markInfo.concat(getMarkForRemoving(newTr, nodes))

                        for (const parent of nodes) {
                            const walker = parent.walker()
                            let event = walker.next()

                            while (event) {
                                const { node, entering } = event

                                if (entering) {
                                    markInfo = markInfo.concat(getMarkForAdding(node, markdownDocument))
                                }
                                event = walker.next()
                            }
                        }
                    } else if (removedNodeRange) {
                        const maxIndex = newTr.doc.childCount - 1
                        const [startLine, endLine] = removedNodeRange.line
                        const startIndex = Math.min(startLine, maxIndex)
                        const endIndex = Math.min(endLine, maxIndex)

                        // cache the index to remove code block, custom block background when there are no adding nodes
                        for (let i = startIndex; i <= endIndex; i += 1) {
                            removingBackgroundIndexMap[i] = true
                        }
                    }
                })
                appendMarkTr(newTr, schema, markInfo)
            }
            return newTr.setMeta('widget', tr.getMeta('widget'))
        }
    })
}

function isDifferentBlock(doc: ProsemirrorNode, index: number, attrs: Record<string, any>) {
    return Object.keys(attrs).some((name) => attrs[name] !== doc.child(index).attrs[name])
}

function addLineBackground(
    tr: Transaction,
    doc: ProsemirrorNode,
    paragraph: NodeType,
    blockPosInfo: BlockPosInfo,
    attrs: Record<string, any> = {}
) {
    const { startIndex, endIndex, from, to } = blockPosInfo
    let shouldChangeBlockType = false

    for (let i = startIndex; i <= endIndex; i += 1) {
    // prevent to remove background of the node that need to have background
        delete removingBackgroundIndexMap[i]
        shouldChangeBlockType = isDifferentBlock(doc, i, attrs)
    }

    if (shouldChangeBlockType) {
        tr.setBlockType(from, to, paragraph, attrs)
    }
}

function appendMarkTr(tr: Transaction, schema: Schema, marks: MarkInfo[]) {
    const { doc } = tr
    const { paragraph } = schema.nodes

    // get start position per line for lazy calculation
    const startPosListPerLine = getStartPosListPerLine(doc, doc.childCount)

    marks.forEach(({ start, end, spec, lineBackground }) => {
        const startIndex = Math.min(start[0], doc.childCount) - 1
        const endIndex = Math.min(end[0], doc.childCount) - 1

        // calculate the position corresponding to the line
        let from = startPosListPerLine[startIndex]
        let to = startPosListPerLine[endIndex]

        // calculate the position corresponding to the character offset of the line
        from += start[1]
        to += end[1]

        if (spec) {
            if (lineBackground) {
                const posInfo = { from, to, startIndex, endIndex }

                addLineBackground(tr, doc, paragraph, posInfo, spec.attrs)
            } else {
                tr.addMark(from, to, schema.mark(spec.type!, spec.attrs))
            }
        } else {
            tr.removeMark(from, to)
        }
    })

    removeBlockBackground(tr, startPosListPerLine, paragraph)
}

function removeBlockBackground(
    tr: Transaction,
    startPosListPerLine: number[],
    paragraph: NodeType
) {
    Object.keys(removingBackgroundIndexMap).forEach((index) => {
        const startIndex = Number(index)
        // get the end position of the current line with the next node start position.
        const endIndex = Math.min(Number(index) + 1, tr.doc.childCount - 1)

        const from = startPosListPerLine[startIndex]
        // subtract '1' for getting end position of the line
        let to = startPosListPerLine[endIndex] - 1

        if (startIndex === endIndex) {
            to += 2
        }

        tr.setBlockType(from, to, paragraph)
    })
}

function cacheIndexToRemoveBackground(doc: ProsemirrorNode, start: MdPos, end: MdPos) {
    const skipLines: number[] = []

    removingBackgroundIndexMap = {}

    for (let i = start[0] - 1; i < end[0]; i += 1) {
        const node = doc.child(i)
        let { codeEnd } = node.attrs as CodeBlockPos
        const { codeStart } = node.attrs as CodeBlockPos

        if (codeStart && codeEnd && !skipLines.includes(codeStart)) {
            skipLines.push(codeStart)
            codeEnd = Math.min(codeEnd, doc.childCount)

            // should subtract '1' to markdown line position
            // because markdown parser has '1'(not zero) as the start number
            const startIndex = codeStart - 1
            const [endIndex] = end

            for (let index = startIndex; index < endIndex; index += 1) {
                removingBackgroundIndexMap[index] = true
            }
        }
    }
}

function getMarkForRemoving({ doc }: Transaction, nodes: MdNode[]) {
    const [start] = nodes[0].sourcepos!
    const [, end] = last(nodes).sourcepos!
    const startPos: MdPos = [start[0], start[1]]
    const endPos: MdPos = [end[0], end[1] + 1]
    const marks: MarkInfo[] = []

    cacheIndexToRemoveBackground(doc, start, end)
    marks.push({ start: startPos, end: endPos })

    return marks
}

function getMarkForAdding(node: MdNode, markdownDocument: MarkdownDocument) {
    const lineTexts = markdownDocument.getLineTexts()
    const startPos: MdPos = [getMdStartLine(node), getMdStartCh(node)]
    const endPos: MdPos = [getMdEndLine(node), getMdEndCh(node) + 1]
    const markInfo = getMarkInfo(node, startPos, endPos, lineTexts[endPos[0] - 1])

    return markInfo ?? []
}
