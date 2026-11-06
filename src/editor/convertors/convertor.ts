import { Node as ProsemirrorNode, Schema } from 'prosemirror-model'

import { ToWwConvertorMap, ToMdConvertors, ToMdConvertorMap } from '../types/convertor'
import { Emitter } from '../types/event'

import { HTMLConvertorMap } from '../../parser/types/renderer'
import { MdNode, Pos as MdPos } from '../../parser/types/node'
import { createWwConvertors } from './to-wysiwyg/to-ww-convertors'
import { ToWwConvertorState } from './to-wysiwyg/to-ww-convertor-state'

import { createMdConvertors } from './to-markdown/to-md-convertors'
import { ToMdConvertorState } from './to-markdown/to-md-convertor-state'

export class Convertor {
    private readonly schema: Schema

    private readonly toWwConvertors: ToWwConvertorMap

    private readonly toMdConvertors: ToMdConvertors

    private readonly eventEmitter: Emitter

    private focusedNode: ProsemirrorNode | MdNode | null

    private mappedPosWhenConverting: number | MdPos | null

    private cursorText: { node: ProsemirrorNode | MdNode, offset: number } | null = null

    constructor(
        schema: Schema,
        toMdConvertors: ToMdConvertorMap,
        toHTMLConvertors: HTMLConvertorMap,
        eventEmitter: Emitter
    ) {
        this.schema = schema
        this.eventEmitter = eventEmitter
        this.focusedNode = null
        this.mappedPosWhenConverting = null
        this.toWwConvertors = createWwConvertors(toHTMLConvertors)
        this.toMdConvertors = createMdConvertors(toMdConvertors || {})

        this.eventEmitter.listen(
            'setFocusedNode',
            (node: ProsemirrorNode | MdNode) => (this.focusedNode = node)
        )
    }

    getMappedPos() {
        return this.mappedPosWhenConverting
    }

    setMappedPos = (pos: number | MdPos) => {
        this.mappedPosWhenConverting = pos
    }

    /** The text node with the cursor and its offset, for the next conversion to map exactly. */
    setCursorText(node: ProsemirrorNode | MdNode | null, offset = 0) {
        this.cursorText = node ? { node, offset } : null
    }

    private getInfoForPosSync() {
        const { cursorText } = this

        this.cursorText = null
        this.mappedPosWhenConverting = null

        return {
            node: this.focusedNode,
            textNode: cursorText?.node ?? null,
            textOffset: cursorText?.offset ?? 0,
            setMappedPos: this.setMappedPos
        }
    }

    toWysiwygModel(mdNode: MdNode) {
        const state = new ToWwConvertorState(this.schema, this.toWwConvertors)

        return state.convertNode(mdNode, this.getInfoForPosSync())
    }

    toMarkdownText(wwNode: ProsemirrorNode) {
        const state = new ToMdConvertorState(this.toMdConvertors)
        let markdownText = state.convertNode(wwNode, this.getInfoForPosSync())

        markdownText = this.eventEmitter.emitReduce('beforeConvertWysiwygToMarkdown', markdownText)

        return markdownText
    }
}
