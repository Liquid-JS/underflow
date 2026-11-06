import { Node, ResolvedPos, Schema } from 'prosemirror-model'
import { Plugin, Selection } from 'prosemirror-state'

import { ToolbarStateMap, ToolbarStateKeys } from '../../types/ui'
import { Emitter } from '../../types/event'

type ListType = 'bulletList' | 'orderedList' | 'taskList'

const EXCEPT_TYPES = ['image', 'link', 'customBlock', 'frontMatter']
const MARK_TYPES = ['strong', 'strike', 'emph', 'code']
const LIST_TYPES: ListType[] = ['bulletList', 'orderedList', 'taskList']
// markdown table cells hold only inline content (and lists written as HTML); list items take any block
const CONTAINER_TYPES = ['tableHeadCell', 'tableBodyCell']
// block items that can not be nested in a table cell
const NOT_NESTABLE_TYPES: ToolbarStateKeys[] = ['heading', 'table', 'thematicBreak', 'codeBlock']

function getToolbarStateType(node: Node, parentNode: Node) {
    const type = node.type.name

    if (type === 'listItem') {
        return node.attrs.task ? 'taskList' : parentNode.type.name
    }

    if (type.indexOf('table') !== -1) {
        return 'table'
    }

    return type
}

function setListNodeToolbarState(type: ToolbarStateKeys, nodeTypeState: ToolbarStateMap) {
    nodeTypeState[type] = { active: true }

    LIST_TYPES.filter((listName) => listName !== type).forEach((listType) => {
        if (nodeTypeState[listType]) {
            delete nodeTypeState[listType]
        }
    })
}

function setMarkTypeStates(
    from: ResolvedPos,
    to: ResolvedPos,
    schema: Schema,
    toolbarState: ToolbarStateMap
) {
    MARK_TYPES.forEach((type) => {
        const mark = schema.marks[type]
        const marksAtPos = from.marksAcross(to) || []
        const foundMark = !!mark.isInSet(marksAtPos)

        if (foundMark) {
            toolbarState[type as ToolbarStateKeys] = { active: true }
        }
    })
}

function isInContainer(pos: ResolvedPos) {
    for (let depth = 1; depth <= pos.depth; depth += 1) {
        if (CONTAINER_TYPES.includes(pos.node(depth).type.name)) {
            return true
        }
    }
    return false
}

function disableNotNestableTypes(toolbarState: ToolbarStateMap) {
    NOT_NESTABLE_TYPES.forEach((type) => {
        toolbarState[type] = { active: !!toolbarState[type]?.active, disabled: true }
    })
}

export function getToolbarState(selection: Selection, doc: Node, schema: Schema) {
    const { $from, $to, from, to } = selection
    const toolbarState = {
        indent: { active: false, disabled: true },
        outdent: { active: false, disabled: true }
    } as ToolbarStateMap

    doc.nodesBetween(from, to, (node, _, parentNode) => {
        const type = getToolbarStateType(node, parentNode!)

        if (EXCEPT_TYPES.includes(type)) {
            return
        }

        if ((LIST_TYPES as string[]).includes(type)) {
            setListNodeToolbarState(type as ToolbarStateKeys, toolbarState)

            toolbarState.indent.disabled = false
            toolbarState.outdent.disabled = false
        } else if (type === 'paragraph' || type === 'text') {
            setMarkTypeStates($from, $to, schema, toolbarState)
        } else {
            toolbarState[type as ToolbarStateKeys] = { active: true }
        }
    })

    if (isInContainer($from) || isInContainer($to)) {
        disableNotNestableTypes(toolbarState)
    }

    return toolbarState
}

export function toolbarStateHighlight(eventEmitter: Emitter) {
    return new Plugin({
        view: () => ({
            update: (view) => {
                const { selection, doc, schema } = view.state

                eventEmitter.emit('changeToolbarState', {
                    toolbarState: getToolbarState(selection, doc, schema)
                })
            }
        })
    })
}
