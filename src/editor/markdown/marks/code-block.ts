import type { Command } from 'prosemirror-state'
import { DOMOutputSpec } from 'prosemirror-model'
import { EditorCommand, MdSpecContext } from '../../types/spec'
import { clsWithMdPrefix } from '../../utils/dom'
import { Mark } from '../../spec/mark'
import { createTextNode, createTextSelection, splitAndExtendBlock } from '../../helper/manipulation'
import { isCodeBlockNode } from '../../utils/markdown'
import { getRangeInfo } from '../helper/pos'
import { getTextContent } from '../helper/query'

const fencedCodeBlockSyntax = '```'

export class CodeBlock extends Mark {
    context!: MdSpecContext

    get name() {
        return 'codeBlock'
    }

    get schema() {
        return {
            toDOM: (): DOMOutputSpec => ['span', { class: clsWithMdPrefix('code-block') }, 0]
        }
    }

    commands(): EditorCommand {
        return () => (state, dispatch) => {
            const { selection, schema, tr } = state
            const { startFromOffset, endToOffset } = getRangeInfo(selection)
            const fencedNode = createTextNode(schema, fencedCodeBlockSyntax)

            // add fenced start block
            tr.insert(startFromOffset, fencedNode).split(startFromOffset + fencedCodeBlockSyntax.length)
            // add fenced end block
            tr.split(tr.mapping.map(endToOffset)).insert(tr.mapping.map(endToOffset), fencedNode)

            dispatch!(
                tr.setSelection(
                    // subtract fenced syntax length and open, close tag(2)
                    createTextSelection(tr, tr.mapping.map(endToOffset) - (fencedCodeBlockSyntax.length + 2))
                )
            )

            return true
        }
    }

    private keepIndentation(): Command {
        return ({ selection, tr, doc, schema }, dispatch) => {
            const { markdownDocument } = this.context
            const { startFromOffset, endToOffset, endIndex, from, to } = getRangeInfo(selection)
            const textContent = getTextContent(doc, endIndex)

            if (from === to && textContent.trim()) {
                const matched = textContent.match(/^\s+/)
                const mdNode = markdownDocument.findFirstNodeAtLine(endIndex + 1)!

                if (isCodeBlockNode(mdNode) && matched) {
                    const [spaces] = matched
                    const slicedText = textContent.slice(to - startFromOffset)
                    const node = createTextNode(schema, spaces + slicedText)

                    splitAndExtendBlock(tr, endToOffset, slicedText, node)

                    dispatch!(tr)

                    return true
                }
            }
            return false
        }
    }

    keymaps() {
        const codeBlockCommand = this.commands()()

        return {
            'Shift-Mod-p': codeBlockCommand,
            'Shift-Mod-P': codeBlockCommand,
            'Enter': this.keepIndentation()
        }
    }
}
