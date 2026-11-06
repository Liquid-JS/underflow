import { NodeType, MarkType, Schema, Node as ProsemirrorNode, Mark } from 'prosemirror-model'
import { WwNodeType, WwMarkType } from './wysiwyg'
import { MdNode, MdNodeType, RendererOptions, HTMLToken, MdPos } from '@liquid-js/underflow/parser'

export type Attrs = { [name: string]: any } | null

export interface StackItem {
    type: NodeType
    attrs: Attrs | null
    content: ProsemirrorNode[]
}

export interface ToWwConvertorState {
    schema: Schema
    top(): StackItem
    push(node: ProsemirrorNode): void
    addText(text: string): void
    openMark(mark: Mark): void
    closeMark(mark: MarkType): void
    addNode(type: NodeType, attrs?: Attrs, content?: ProsemirrorNode[]): ProsemirrorNode | null
    openNode(type: NodeType, attrs?: Attrs): void
    closeNode(): ProsemirrorNode | null
    convertNode(mdNode: MdNode, infoForPosSync: InfoForPosSync): ProsemirrorNode | null
    convertByDOMParser(root: HTMLElement): void
}

export type ToWwConvertor = (
    state: ToWwConvertorState,
    node: MdNode,
    context: {
        entering: boolean
        skipChildren: () => void
        leaf: boolean
        options: Omit<RendererOptions, 'convertors'>
        getChildrenText: (mdNode: MdNode) => string
        origin?: () => HTMLToken | HTMLToken[] | null
    },
    customAttrs?: { htmlAttrs?: Record<string, any>, classNames?: string[] }
) => void

export type ToWwConvertorMap = Partial<Record<string, ToWwConvertor>>

export type FirstDelimFn = (index: number) => string

export interface ToMdConvertorState {
    stopNewline: boolean
    inTable: boolean
    tightListItem: boolean
    getCursorOffset(node: ProsemirrorNode): number | null
    mapCursor(): void
    getDelim(): string
    setDelim(delim: string): void
    flushClose(size?: number): void
    wrapBlock(delim: string, firstDelim: string | null, node: ProsemirrorNode, fn: () => void): void
    ensureNewLine(): void
    write(content?: string): void
    closeBlock(node: ProsemirrorNode): void
    text(text: string, escaped?: boolean): void
    convertBlock(node: ProsemirrorNode, parent: ProsemirrorNode, index: number): void
    convertInline(parent: ProsemirrorNode): void
    convertList(node: ProsemirrorNode, delim: string, firstDelimFn: FirstDelimFn): void
    convertTableCell(node: ProsemirrorNode): void
    convertNode(parent: ProsemirrorNode, infoForPosSync?: InfoForPosSync): string
}

export interface ToDOMAdaptor {
    getToDOMNode(type: string): ((node: ProsemirrorNode | Mark) => Node) | null
}

export type HTMLToWwConvertor = (
    state: ToWwConvertorState,
    node: MdNode,
    openTagName: string
) => void

export type HTMLToWwConvertorMap = Partial<Record<string, HTMLToWwConvertor>>

export interface FlattenHTMLToWwConvertorMap {
    [k: string]: HTMLToWwConvertor
}

export interface NodeInfo {
    node: ProsemirrorNode
    parent?: ProsemirrorNode
    index?: number
}

export interface MarkInfo {
    node: Mark
    parent?: ProsemirrorNode
    index?: number
}

export interface ToMdConvertorReturnValues {
    delim?: string | string[]
    rawHTML?: string | string[] | null
    text?: string
    attrs?: Attrs
}

export type ToMdNodeTypeWriter = (
    state: ToMdConvertorState,
    nodeInfo: NodeInfo,
    params: ToMdConvertorReturnValues
) => void

export type ToMdNodeTypeWriterMap = Partial<Record<WwNodeType, ToMdNodeTypeWriter>>

export interface ToMdMarkTypeOption {
    mixable?: boolean
    removedEnclosingWhitespace?: boolean
    escape?: boolean
    delim?: string | string[]
}

export type ToMdMarkTypeOptions = Partial<Record<WwMarkType, ToMdMarkTypeOption | null>>

export type ToMdNodeTypeConvertor = (state: ToMdConvertorState, nodeInfo: NodeInfo) => void

export type ToMdNodeTypeConvertorMap = Partial<Record<WwNodeType, ToMdNodeTypeConvertor>>

export type ToMdMarkTypeConvertor = (
    nodeInfo?: MarkInfo,
    entering?: boolean,
    nonSpecEmphasis?: boolean
) => ToMdConvertorReturnValues & ToMdMarkTypeOption

export type ToMdMarkTypeConvertorMap = Partial<Record<WwMarkType, ToMdMarkTypeConvertor>>

export interface ToMdConvertorContext {
    origin?: () => ReturnType<ToMdConvertor>
    entering?: boolean
    inTable?: boolean
}

export type ToMdConvertor = (
    nodeInfo: NodeInfo | MarkInfo,
    context: ToMdConvertorContext,
    nonSpecEmphasis?: boolean
) => ToMdConvertorReturnValues

export type ToMdConvertorMap = Partial<Record<WwNodeType | WwMarkType | MdNodeType, ToMdConvertor>>

export interface ToMdConvertors {
    nodeTypeConvertors: ToMdNodeTypeConvertorMap
    markTypeConvertors: ToMdMarkTypeConvertorMap
}

export interface InfoForPosSync {
    /** the block with the cursor, mapped to its start (WYSIWYG) or end (markdown) */
    node: MdNode | ProsemirrorNode | null
    /** the text with the cursor and the cursor's offset in it, mapped exactly when known */
    textNode?: MdNode | ProsemirrorNode | null
    textOffset?: number
    setMappedPos: (pos: MdPos | number) => void
}
