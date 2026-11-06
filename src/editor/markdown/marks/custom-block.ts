import { DOMOutputSpec } from 'prosemirror-model'
import { EditorCommand } from '../../types/spec'
import { clsWithMdPrefix } from '../../utils/dom'
import { Mark } from '../../spec/mark'
import { createTextNode, createTextSelection } from '../../helper/manipulation'
import { getRangeInfo } from '../helper/pos'

const customBlockSyntax = '$$'

export class CustomBlock extends Mark {
    get name() {
        return 'customBlock'
    }

    get schema() {
        return {
            toDOM: (): DOMOutputSpec => ['span', { class: clsWithMdPrefix('custom-block') }, 0]
        }
    }

    commands(): EditorCommand {
        return (payload) => (state, dispatch) => {
            const { selection, schema, tr } = state
            const { startFromOffset, endToOffset } = getRangeInfo(selection)

            if (!payload?.info) {
                return false
            }

            const customBlock = `${customBlockSyntax}${payload.info}`
            const startNode = createTextNode(schema, customBlock)
            const endNode = createTextNode(schema, customBlockSyntax)

            tr.insert(startFromOffset, startNode).split(startFromOffset + customBlock.length)
            tr.split(tr.mapping.map(endToOffset)).insert(tr.mapping.map(endToOffset), endNode)

            dispatch!(
                tr.setSelection(
                    createTextSelection(tr, tr.mapping.map(endToOffset) - (customBlockSyntax.length + 2))
                )
            )

            return true
        }
    }
}
