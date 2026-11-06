import { CustomParserMap } from '../types/parser'
import { pos } from '../../../test/parser'
import { Parser } from './blocks'
import { BaseNode } from './node'

it('tags in disallowedHtmlBlockTags should not be parsed as a HTML block', () => {
    const reader = new Parser({ disallowedHtmlBlockTags: ['br', 'span'] })
    const root = reader.parse('<BR />\nHello\n\n<span class="example">\nWorld')

    expect(root).toMatchObject({
        type: 'document',
        firstChild: {
            type: 'paragraph',
            firstChild: {
                type: 'htmlInline',
                literal: '<BR />',
                next: {
                    type: 'softbreak',
                    next: {
                        type: 'text',
                        literal: 'Hello'
                    }
                }
            },
            next: {
                type: 'paragraph',
                firstChild: {
                    type: 'htmlInline',
                    literal: '<span class="example">',
                    next: {
                        type: 'softbreak',
                        next: {
                            type: 'text',
                            literal: 'World'
                        }
                    }
                }
            }
        }
    })
})

it('should apply the custom parser', () => {
    let inEmph = false
    const customParser: CustomParserMap = {
        emph: (node: BaseNode, { entering }) => {
            inEmph = entering

            while (node.firstChild) {
                node.insertBefore(node.firstChild)
            }
            node.unlink()
        },
        text: (node: BaseNode) => {
            if (inEmph) {
                node.literal = node.literal!.toUpperCase()
            }
        }
    }
    const reader = new Parser({ customParser })
    const root = reader.parse('*test*')

    expect(root).toMatchObject({
        type: 'document',
        firstChild: {
            type: 'paragraph',
            sourcepos: pos(1, 1, 1, 6),
            firstChild: {
                type: 'text',
                sourcepos: pos(1, 2, 1, 5),
                literal: 'TEST'
            }
        }
    })
})
