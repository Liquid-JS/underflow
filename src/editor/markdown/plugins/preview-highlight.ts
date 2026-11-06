import { EditorState, Plugin } from 'prosemirror-state'
import { MdContext } from '../../types/spec'
import { ToolbarStateMap, ToolbarStateKeys } from '../../types/ui'
import { traverseParentNodes, isListNode } from '../../utils/markdown'
import { MdNode, MdPos, MarkdownDocument } from '@liquid-js/underflow/parser'

const defaultToolbarStateKeys: ToolbarStateKeys[] = [
    'taskList',
    'orderedList',
    'bulletList',
    'table',
    'strong',
    'emph',
    'strike',
    'heading',
    'thematicBreak',
    'blockQuote',
    'code',
    'codeBlock',
    'indent',
    'outdent'
]

function getToolbarStateType(mdNode: MdNode) {
    const { type } = mdNode

    if (isListNode(mdNode)) {
        if (mdNode.listData.task) {
            return 'taskList'
        }
        return mdNode.listData.type === 'ordered' ? 'orderedList' : 'bulletList'
    }

    if (type.indexOf('table') !== -1) {
        return 'table'
    }

    if (!(defaultToolbarStateKeys as string[]).includes(type)) {
        return null
    }

    return type as ToolbarStateKeys
}

function getToolbarState(targetNode: MdNode) {
    const toolbarState = {
        indent: { active: false, disabled: true },
        outdent: { active: false, disabled: true }
    } as ToolbarStateMap

    let listEnabled = true

    traverseParentNodes(targetNode, (mdNode) => {
        const type = getToolbarStateType(mdNode)

        if (!type) {
            return
        }

        if (type === 'bulletList' || type === 'orderedList') {
            // to apply the nearlist list state in the nested list
            if (listEnabled) {
                toolbarState[type] = { active: true }

                toolbarState.indent.disabled = false
                toolbarState.outdent.disabled = false

                listEnabled = false
            }
        } else {
            toolbarState[type as ToolbarStateKeys] = { active: true }
        }
    })

    return toolbarState
}

export function getCursorInfo(state: EditorState, markdownDocument: MarkdownDocument) {
    const { from } = state.selection
    const startChOffset = state.doc.resolve(from).start()
    const line = state.doc.content.findIndex(from).index + 1
    let ch = from - startChOffset

    if (from === startChOffset) {
        ch += 1
    }
    const cursorPos: MdPos = [line, ch]
    const mdNode = markdownDocument.findNodeAtPosition(cursorPos)!

    return { cursorPos, mdNode, toolbarState: getToolbarState(mdNode) }
}

export function previewHighlight({ markdownDocument, eventEmitter }: MdContext) {
    return new Plugin({
        view: () => ({
            update: (view, prevState) => {
                const { state } = view
                const { doc, selection } = state

                if (prevState && prevState.doc.eq(doc) && prevState.selection.eq(selection)) {
                    return
                }
                const { cursorPos, mdNode, toolbarState } = getCursorInfo(state, markdownDocument)

                eventEmitter.emit('changeToolbarState', {
                    cursorPos,
                    mdNode,
                    toolbarState
                })
                eventEmitter.emit('setFocusedNode', mdNode)
            }
        })
    })
}
