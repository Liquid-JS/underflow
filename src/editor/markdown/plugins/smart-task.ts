import { Plugin } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { MdContext } from '../../types/spec'
import { findClosestNode } from '../../utils/markdown'
import { getRangeInfo, getNodeContentOffsetRange } from '../helper/pos'
import { Pos as MdPos } from '../../../parser/types/node'

const reTaskMarkerKey = /x|backspace/i
const reTaskMarker = /^\[(\s*)(x?)(\s*)\](?:\s+)/i

export function smartTask({ schema, markdownDocument }: MdContext) {
    return new Plugin({
        props: {
            handleDOMEvents: {
                keyup: (view: EditorView, ev: KeyboardEvent) => {
                    const { doc, tr, selection } = view.state

                    if (!view.editable) {
                        return false
                    }

                    if (selection.empty && reTaskMarkerKey.test(ev.key)) {
                        const { startIndex, startFromOffset, from } = getRangeInfo(selection)
                        // should add `1` to line for the markdown parser
                        // because markdown parser has `1`(not zero) as the start number
                        const mdPos: MdPos = [startIndex + 1, from - startFromOffset + 1]
                        const mdNode = markdownDocument.findNodeAtPosition(mdPos)!
                        const paraNode = findClosestNode(
                            mdNode,
                            (node) => node!.type === 'paragraph' && node.parent?.type === 'item'
                        )

                        if (paraNode?.firstChild?.literal) {
                            const { firstChild } = paraNode
                            const matched = firstChild.literal!.match(reTaskMarker)

                            if (matched) {
                                const [startMdPos] = firstChild.sourcepos!
                                const [, startSpaces, stateChar, lastSpaces] = matched
                                const spaces = startSpaces.length + lastSpaces.length
                                const { startOffset } = getNodeContentOffsetRange(doc, startMdPos[0] - 1)
                                const startPos = startMdPos[1] + startOffset

                                if (stateChar) {
                                    const addedPos = spaces ? spaces + 1 : 0

                                    tr.replaceWith(startPos, addedPos + startPos, schema.text(stateChar))
                                    view.dispatch(tr)
                                } else if (!spaces) {
                                    tr.insertText(' ', startPos)
                                    view.dispatch(tr)
                                }
                            }
                        }
                    }
                    return false
                }
            }
        }
    })
}
