import { Renderer } from '../html/renderer'
import { Parser } from './blocks'
import { CustomInlineNode, BaseNode } from './node'

const reader = new Parser({ widgetRules: [/@\w+/, /\[(@\w+)\]\(\S+\)/] })
const renderer = new Renderer()

function widgets(root: BaseNode) {
    const found: Array<[string, string, unknown]> = []
    const walker = root.walker()
    let event

    while ((event = walker.next())) {
        const { node, entering } = event

        if (entering && node.type === 'customInline') {
            found.push([(node as CustomInlineNode).info, node.firstChild!.literal!, node.sourcepos])
        }
    }

    return found
}

describe('widget rules', () => {
    it('should parse matching text as a customInline node', () => {
        const root = reader.parse('Hello @joe and @ann!')

        expect(widgets(root)).toEqual([
            ['widget0', '@joe', [[1, 7], [1, 10]]],
            ['widget0', '@ann', [[1, 16], [1, 19]]]
        ])
        expect(root.firstChild!.firstChild!.literal).toBe('Hello ')
        expect(root.firstChild!.lastChild!.literal).toBe('!')
    })

    it('should match markdown syntax, taking the first rule that matches earliest', () => {
        expect(widgets(reader.parse('see [@joe](https://x/joe) now'))).toEqual([
            ['widget1', '[@joe](https://x/joe)', [[1, 5], [1, 25]]]
        ])
    })

    it('should work inside emphasis, links and on later lines', () => {
        expect(widgets(reader.parse('*hi @joe*\nand **@ann**'))).toEqual([
            ['widget0', '@joe', [[1, 5], [1, 8]]],
            ['widget0', '@ann', [[2, 7], [2, 10]]]
        ])
    })

    it('should not match in code spans, code blocks or escaped text', () => {
        expect(widgets(reader.parse('`@joe` \\@ann\n\n    @bob\n\n```\n@kim\n```'))).toEqual([])
    })

    it('should keep `$$` as text', () => {
        const root = new Parser().parse('math $$x^2$$ and $$myInline text$$')

        expect(renderer.render(root)).toBe('<p>math $$x^2$$ and $$myInline text$$</p>\n')
    })
})
