import {
    BlockMdNode,
    BlockNodeType,
    CodeBlockMdNode,
    CodeMdNode,
    CustomBlockMdNode,
    CustomInlineMdNode,
    HeadingMdNode,
    HtmlBlockMdNode,
    LinkMdNode,
    ListData,
    ListMdNode,
    MdNode,
    MdNodeType,
    RefDefMdNode,
    Sourcepos,
    TableCellMdNode,
    TableColumn,
    TableMdNode
} from '../types/node'
import { NodeWalker } from './node-walker'

export function isContainer(node: BaseNode) {
    switch (node.type) {
        case 'document':
        case 'blockQuote':
        case 'list':
        case 'item':
        case 'paragraph':
        case 'heading':
        case 'emph':
        case 'strong':
        case 'strike':
        case 'link':
        case 'image':
        case 'table':
        case 'tableHead':
        case 'tableBody':
        case 'tableRow':
        case 'tableCell':
        case 'tableDelimRow':
        case 'customInline':
            return true
        default:
            return false
    }
}

let lastNodeId = 1
let nodeMap: { [key: number]: BaseNode } = {}

export function getNodeById(id: number) {
    return nodeMap[id]
}

export function removeNodeById(id: number) {
    delete nodeMap[id]
}

export function removeAllNode() {
    nodeMap = {}
}

export class BaseNode implements MdNode {
    type: MdNodeType
    id: number
    parent: BaseNode | null = null
    prev: BaseNode | null = null
    next: BaseNode | null = null
    sourcepos?: Sourcepos

    // only for container node
    firstChild: BaseNode | null = null
    lastChild: BaseNode | null = null

    // only for leaf node
    literal: string | null = null

    constructor(nodeType: MdNodeType, sourcepos?: Sourcepos) {
        if (nodeType === 'document') {
            this.id = -1
        } else {
            this.id = lastNodeId++
        }

        this.type = nodeType
        this.sourcepos = sourcepos
        nodeMap![this.id] = this
    }

    isContainer() {
        return isContainer(this)
    }

    unlink() {
        if (this.prev) {
            this.prev.next = this.next
        } else if (this.parent) {
            this.parent.firstChild = this.next
        }
        if (this.next) {
            this.next.prev = this.prev
        } else if (this.parent) {
            this.parent.lastChild = this.prev
        }
        this.parent = null
        this.next = null
        this.prev = null
    }

    replaceWith(node: BaseNode) {
        this.insertBefore(node)
        this.unlink()
    }

    insertAfter(sibling: BaseNode) {
        sibling.unlink()
        sibling.next = this.next
        if (sibling.next) {
            sibling.next.prev = sibling
        }
        sibling.prev = this
        this.next = sibling
        if (this.parent) {
            sibling.parent = this.parent
            if (!sibling.next) {
                sibling.parent.lastChild = sibling
            }
        }
    }

    insertBefore(sibling: BaseNode) {
        sibling.unlink()
        sibling.prev = this.prev
        if (sibling.prev) {
            sibling.prev.next = sibling
        }
        sibling.next = this
        this.prev = sibling
        sibling.parent = this.parent
        if (!sibling.prev) {
            sibling.parent!.firstChild = sibling
        }
    }

    appendChild(child: BaseNode) {
        child.unlink()
        child.parent = this
        if (this.lastChild) {
            this.lastChild.next = child
            child.prev = this.lastChild
            this.lastChild = child
        } else {
            this.firstChild = child
            this.lastChild = child
        }
    }

    prependChild(child: BaseNode) {
        child.unlink()
        child.parent = this
        if (this.firstChild) {
            this.firstChild.prev = child
            child.next = this.firstChild
            this.firstChild = child
        } else {
            this.firstChild = child
            this.lastChild = child
        }
    }

    walker() {
        return new NodeWalker(this)
    }
}

export class BlockNode extends BaseNode implements BlockMdNode {
    type: BlockNodeType

    // temporal data (for parsing)
    open = true
    lineOffsets: number[] | null = null
    stringContent: string | null = null

    constructor(nodeType: BlockNodeType, sourcepos?: Sourcepos) {
        super(nodeType, sourcepos)
        this.type = nodeType
    }
}

export class ListNode extends BlockNode implements ListMdNode {
    listData: ListData | null = null
}

export class HeadingNode extends BlockNode implements HeadingMdNode {
    level = 0
    headingType: 'atx' | 'setext' = 'atx'
}

export class CodeBlockNode extends BlockNode implements CodeBlockMdNode {
    isFenced = false
    fenceChar: string | null = null
    fenceLength = 0
    fenceOffset = -1
    info: string | null = null
    infoPadding = 0
}

export class TableNode extends BlockNode implements TableMdNode {
    columns: TableColumn[] = []
}

export class TableCellNode extends BlockNode implements TableCellMdNode {
    startIdx = 0
    endIdx = 0
    paddingLeft = 0
    paddingRight = 0
    ignored = false
}

export class RefDefNode extends BlockNode implements RefDefMdNode {
    title = ''
    dest = ''
    label = ''
}

export class CustomBlockNode extends BlockNode implements CustomBlockMdNode {
    syntaxLength = 0
    offset = -1
    info = ''
}

export class HtmlBlockNode extends BlockNode implements HtmlBlockMdNode {
    htmlBlockType = -1
}

export class LinkNode extends BaseNode implements LinkMdNode {
    destination: string | null = null
    title: string | null = null
    extendedAutolink = false
    lastChild!: BaseNode
}

export class CodeNode extends BaseNode implements CodeMdNode {
    tickCount = 0
}

export class CustomInlineNode extends BaseNode implements CustomInlineMdNode {
    info = ''
}

export function createNode(type: 'heading', sourcepos?: Sourcepos): HeadingNode
export function createNode(type: 'list' | 'item', sourcepos?: Sourcepos): ListNode
export function createNode(type: 'codeBlock', sourcepos?: Sourcepos): CodeBlockNode
export function createNode(type: 'htmlBlock', sourcepos?: Sourcepos): HtmlBlockNode
export function createNode(type: 'link' | 'image', sourcepos?: Sourcepos): LinkNode
export function createNode(type: 'code', sourcepos?: Sourcepos): CodeNode
export function createNode(type: 'table' | 'tableCell', sourcepos?: Sourcepos): TableNode
export function createNode(type: 'refDef', sourcepos?: Sourcepos): RefDefNode
export function createNode(type: 'customBlock', sourcepos?: Sourcepos): CustomBlockNode
export function createNode(type: BlockNodeType, sourcepos?: Sourcepos): BlockNode
export function createNode(type: MdNodeType, sourcepos?: Sourcepos): BaseNode
export function createNode(type: MdNodeType, sourcepos?: Sourcepos) {
    switch (type) {
        case 'heading':
            return new HeadingNode(type, sourcepos)
        case 'list':
        case 'item':
            return new ListNode(type, sourcepos)
        case 'link':
        case 'image':
            return new LinkNode(type, sourcepos)
        case 'codeBlock':
            return new CodeBlockNode(type, sourcepos)
        case 'htmlBlock':
            return new HtmlBlockNode(type, sourcepos)
        case 'table':
            return new TableNode(type, sourcepos)
        case 'tableCell':
            return new TableCellNode(type, sourcepos)
        case 'document':
        case 'paragraph':
        case 'blockQuote':
        case 'thematicBreak':
        case 'tableRow':
        case 'tableBody':
        case 'tableHead':
        case 'frontMatter':
            return new BlockNode(type, sourcepos)
        case 'code':
            return new CodeNode(type, sourcepos)
        case 'refDef':
            return new RefDefNode(type, sourcepos)
        case 'customBlock':
            return new CustomBlockNode(type, sourcepos)
        case 'customInline':
            return new CustomInlineNode(type, sourcepos)
        default:
            return new BaseNode(type, sourcepos) as BaseNode
    }
}

export function isCodeBlock(node: BaseNode): node is CodeBlockNode {
    return node.type === 'codeBlock'
}

export function isHtmlBlock(node: BaseNode): node is HtmlBlockNode {
    return node.type === 'htmlBlock'
}

export function isHeading(node: BaseNode): node is HeadingNode {
    return node.type === 'heading'
}

export function isList(node: BaseNode): node is ListNode {
    return node.type === 'list'
}

export function isTable(node: BaseNode): node is TableNode {
    return node.type === 'table'
}

export function isRefDef(node: BaseNode): node is RefDefNode {
    return node.type === 'refDef'
}

export function isCustomBlock(node: BaseNode): node is CustomBlockNode {
    return node.type === 'customBlock'
}

export function isCustomInline(node: BaseNode) {
    return node.type === 'customInline'
}

export function text(s: string, sourcepos?: Sourcepos) {
    const node = createNode('text', sourcepos)
    node.literal = s
    return node
}
