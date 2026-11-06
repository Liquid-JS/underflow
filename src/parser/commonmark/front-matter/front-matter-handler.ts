import { Process, BlockHandler } from '../block-handlers'
import { BlockNode } from '../node'
import { reFrontMatter } from './front-matter-start'

export const frontMatter: BlockHandler = {
    continue: (parser, container: BlockNode) => {
        const line = parser.currentLine
        const match = line.match(reFrontMatter)

        if (container.type === 'frontMatter' && match) {
            container.stringContent += line
            parser.lastLineLength = match[0].length
            parser.finalize(container as BlockNode, parser.lineNumber)
            return Process.Finished
        }
        return Process.Go
    },
    finalize: (_, block: BlockNode) => {
        if (block.stringContent === null) {
            return
        }
        block.literal = block.stringContent
        block.stringContent = null
    },
    canContain: () => false,
    acceptsLines: true
}
