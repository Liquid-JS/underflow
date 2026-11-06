import { BlockMdNode, MdNode, MdNodeType, RefDefMdNode, Sourcepos } from './node'

export type AutolinkParser = (
    content: string
) => Array<{
    url: string
    text: string
    range: [number, number]
}>

export type CustomParser = (
    node: MdNode,
    context: { entering: boolean, options: ParserOptions }
) => void
export type CustomParserMap = Partial<Record<MdNodeType, CustomParser>>

export interface RefDefState {
    id: number
    destination: string
    title: string
    unlinked: boolean
    sourcepos: Sourcepos
}

export interface RefMap {
    [k: string]: RefDefState
}

export interface RefLinkCandidateMap {
    [k: number]: {
        node: BlockMdNode
        refLabel: string
    }
}

export interface RefDefCandidateMap {
    [k: number]: RefDefMdNode
}

export interface ParserOptions {
    smart: boolean
    tagFilter: boolean
    extendedAutolinks: boolean | AutolinkParser
    disallowedHtmlBlockTags: string[]
    referenceDefinition: boolean
    frontMatter: boolean
    customParser: CustomParserMap | null
    /**
     * Patterns of inline widgets: text matching one, outside code spans and code blocks, becomes
     * a `customInline` node with the info `widget<index>` holding the matched text.
     */
    widgetRules: RegExp[]
}
