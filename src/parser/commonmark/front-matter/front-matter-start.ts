import { BlockStart, Matched } from '../block-starts'
import { BlockNode } from '../node'

// `---` for YAML, `+++` for TOML, `;;;` for JSON
export const reFrontMatter = /^(-{3}|\+{3}|;{3})$/

export const frontMatter: BlockStart = (parser, container) => {
    const { currentLine, lineNumber, indented } = parser

    if (
        lineNumber === 1 &&
    !indented &&
    container.type === 'document' &&
    reFrontMatter.test(currentLine)
    ) {
        parser.closeUnmatchedBlocks()
        const frontMatterNode = parser.addChild('frontMatter', parser.nextNonspace) as BlockNode
        frontMatterNode.stringContent = currentLine

        parser.advanceNextNonspace()
        parser.advanceOffset(currentLine.length, false)

        return Matched.Leaf
    }
    return Matched.None
}
