import { Schema, Node, NodeType, Mark, MarkType, DOMParser } from 'prosemirror-model'

import { ToWwConvertorMap, StackItem, Attrs, InfoForPosSync } from '../../types/convertor'
import { last } from '../../utils/common'
import { isContainer, getChildrenText } from '../../utils/markdown'
import { MdNode } from '../../../parser/types/node'

export function mergeMarkText(a: Node, b: Node) {
    if (a.isText && b.isText && Mark.sameSet(a.marks, b.marks)) {
        return a.type.schema.text(a.text! + b.text, a.marks)
    }

    return false
}

export class ToWwConvertorState {
    public readonly schema: Schema

    private readonly convertors: ToWwConvertorMap

    private stack: StackItem[]

    private marks: Mark[]

    constructor(schema: Schema, convertors: ToWwConvertorMap) {
        this.schema = schema
        this.convertors = convertors
        this.stack = [{ type: this.schema.topNodeType, attrs: null, content: [] }]
        this.marks = Mark.none as Mark[]
    }

    top() {
        return last(this.stack)
    }

    push(node: Node) {
        if (this.stack.length) {
            this.top().content.push(node)
        }
    }

    addText(text: string) {
        if (text) {
            const nodes = this.top().content
            const lastNode = last(nodes)
            const node = this.schema.text(text, this.marks)
            const merged = lastNode && mergeMarkText(lastNode, node)

            if (merged) {
                nodes[nodes.length - 1] = merged
            } else {
                nodes.push(node)
            }
        }
    }

    openMark(mark: Mark) {
        this.marks = mark.addToSet(this.marks) as Mark[]
    }

    closeMark(mark: MarkType) {
        this.marks = mark.removeFromSet(this.marks) as Mark[]
    }

    addNode(type: NodeType, attrs: Attrs, content: Node[]) {
        const node = type.createAndFill(attrs, content, this.marks)

        if (node) {
            this.push(node)

            return node
        }

        return null
    }

    openNode(type: NodeType, attrs: Attrs) {
        this.stack.push({ type, attrs, content: [] })
    }

    closeNode() {
        if (this.marks.length) {
            this.marks = Mark.none as Mark[]
        }

        const { type, attrs, content } = this.stack.pop() as StackItem

        return this.addNode(type, attrs, content)
    }

    convertByDOMParser(root: HTMLElement) {
        const doc = DOMParser.fromSchema(this.schema).parse(root)

        doc.content.forEach((node) => this.push(node))
    }

    private closeUnmatchedHTMLInline(node: MdNode, entering: boolean) {
        if (!entering && node.type !== 'htmlInline') {
            const length = this.stack.length - 1

            for (let i = length; i >= 0; i -= 1) {
                const nodeInfo = this.stack[i]

                if (nodeInfo.attrs?.rawHTML) {
                    if (nodeInfo.content.length) {
                        this.closeNode()
                    } else {
                        // just pop useless unmatched html inline node
                        this.stack.pop()
                    }
                } else {
                    break
                }
            }
        }
    }

    private convert(mdNode: MdNode, infoForPosSync?: InfoForPosSync) {
        const walker = mdNode.walker()
        let textMapped = false
        let event = walker.next()

        while (event) {
            const { node, entering } = event
            const convertor = this.convertors[node.type]

            let skipped = false

            if (convertor) {
                const context = {
                    entering,
                    leaf: !isContainer(node),
                    getChildrenText,
                    options: { gfm: true, nodeId: false, tagFilter: false, softbreak: '\n' },
                    skipChildren: () => {
                        skipped = true
                    }
                }

                this.closeUnmatchedHTMLInline(node, entering)
                convertor(this, node, context)

                if (infoForPosSync?.textNode === node) {
                    // the cursor's offset in the text just added, at the end of the innermost open node
                    const text = (node.literal || '').replace(/\n$/, '')
                    const contentSize = (content: Node[]) =>
                        content.reduce((size, pmNode) => size + pmNode.nodeSize, 0)
                    const insertion = this.stack.reduce(
                        (size, stackItem) => size + contentSize(stackItem.content),
                        this.stack.length - 1
                    )

                    infoForPosSync.setMappedPos(
                        insertion - text.length + Math.min(infoForPosSync.textOffset ?? 0, text.length)
                    )
                    textMapped = true
                } else if (infoForPosSync?.node === node && !textMapped) {
                    const pos =
                        this.stack.reduce(
                            (nodeSize, stackItem) =>
                                nodeSize +
                stackItem.content.reduce((contentSize, pmNode) => contentSize + pmNode.nodeSize, 0),
                            0
                        ) + 1

                    infoForPosSync.setMappedPos(pos)
                }
            }

            if (skipped) {
                walker.resumeAt(node, false)
                walker.next()
            }

            event = walker.next()
        }
    }

    convertNode(mdNode: MdNode, infoForPosSync?: InfoForPosSync) {
        this.convert(mdNode, infoForPosSync)

        if (this.stack.length) {
            return this.closeNode()
        }

        return null
    }
}
