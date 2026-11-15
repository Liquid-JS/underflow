import { Renderer } from '../html/renderer'
import { Parser } from './blocks'
import { BaseNode } from './node'

const reader = new Parser({ smart: true, extendedAutolinks: true })
const renderer = new Renderer({ gfm: true })

const render = (markdown: string) => renderer.render(reader.parse(markdown))

/** The literals of the text nodes, as written in the markdown. */
function literals(root: BaseNode) {
    const walker = root.walker()
    const result: string[] = []
    let event
    while ((event = walker.next())) {
        if (event.entering && event.node.type === 'text') {
            result.push(event.node.literal!)
        }
    }
    return result
}

// The examples of commonmark.js's smart punctuation tests.
describe('smart punctuation', () => {
    it('should make quotes curly, opening and closing', () => {
        expect(render('"Hello," said the spider.\n"\'Shelob\' is my name."')).toBe(
            '<p>“Hello,” said the spider.\n“‘Shelob’ is my name.”</p>\n'
        )
        expect(render('\'A\', \'B\', and \'C\' are letters.')).toBe(
            '<p>‘A’, ‘B’, and ‘C’ are letters.</p>\n'
        )
        expect(render('\'Oak,\' \'elm,\' and \'beech\' are names of trees.\nSo is \'pine.\'')).toBe(
            '<p>‘Oak,’ ‘elm,’ and ‘beech’ are names of trees.\nSo is ‘pine.’</p>\n'
        )
        expect(render('\'He said, "I want to go."\'')).toBe('<p>‘He said, “I want to go.”’</p>\n')
    })

    it('should make apostrophes', () => {
        expect(render('Were you alive in the 70\'s?')).toBe('<p>Were you alive in the 70’s?</p>\n')
        expect(render('\'tis the season to be \'jolly\'')).toBe('<p>’tis the season to be ‘jolly’</p>\n')
        expect(render('\'We\'ll use Jane\'s boat and John\'s truck,\' Jenna said.')).toBe(
            '<p>‘We’ll use Jane’s boat and John’s truck,’ Jenna said.</p>\n'
        )
    })

    it('should quote code and links, and leave code as it is', () => {
        expect(render('Here is some quoted \'`code`\' and a "[quoted link](url)".')).toBe(
            '<p>Here is some quoted ‘<code>code</code>’ and a “<a href="url">quoted link</a>”.</p>\n'
        )
        expect(render('`"it\'s" -- ...`')).toBe('<p><code>&quot;it\'s&quot; -- ...</code></p>\n')
    })

    it('should open a quote without a closing one', () => {
        expect(render('"A paragraph with no closing quote.\n\n"Second paragraph by same speaker, in fiction."')).toBe(
            '<p>“A paragraph with no closing quote.</p>\n<p>“Second paragraph by same speaker, in fiction.”</p>\n'
        )
    })

    it('should leave escaped quotes, hyphens and dots as they are', () => {
        expect(render('\\"This is not smart.\\"\nThis isn\\\'t either.\n5\\\'8\\"')).toBe(
            '<p>&quot;This is not smart.&quot;\nThis isn\'t either.\n5\'8&quot;</p>\n'
        )
        expect(render('Escaped hyphens: \\-- \\-\\-\\-.')).toBe('<p>Escaped hyphens: -- ---.</p>\n')
        expect(render('No ellipses: .\\.. \\.\\.\\.')).toBe('<p>No ellipses: ... ...</p>\n')
        expect(render('An entity: &#45;-')).toBe('<p>An entity: --</p>\n')
    })

    it('should make dashes', () => {
        expect(render('Some dashes:  em---em\nen--en\nem --- em\nen -- en\n2--3')).toBe(
            '<p>Some dashes:  em—em\nen–en\nem — em\nen – en\n2–3</p>\n'
        )
        expect(
            render(
                'one-\ntwo--\nthree---\nfour----\nfive-----\nsix------\nseven-------\neight--------\nnine---------\nthirteen-------------.'
            )
        ).toBe(
            '<p>one-\ntwo–\nthree—\nfour––\nfive—–\nsix——\nseven—––\n' +
                'eight––––\nnine———\nthirteen———––.</p>\n'
        )
    })

    it('should make ellipses', () => {
        expect(render('Ellipses...and...and....')).toBe('<p>Ellipses…and…and….</p>\n')
    })
})

describe('smart punctuation, keeping the markdown', () => {
    it('should keep the text as written in the literals', () => {
        const root = reader.parse('"It\'s" -- one... *\'two\'*')

        expect(literals(root)).toEqual(['"It\'s" -- one... ', '\'two\''])
    })

    it('should give the text with trailing spaces before a line break its smart text', () => {
        expect(render('"one"  \n"two"')).toBe('<p>“one”<br />\n“two”</p>\n')
    })

    it('should leave URLs as they are, and keep the smart text around them', () => {
        // GFM leaves the dots at the end out of the link.
        expect(render('"See" www.example.com/a--b... -- "here"')).toBe(
            '<p>“See” <a href="http://www.example.com/a--b">www.example.com/a--b</a>… – “here”</p>\n'
        )
        expect(render('"See" <https://example.com/a--b...> -- now')).toBe(
            '<p>“See” <a href="https://example.com/a--b...">https://example.com/a--b...</a> – now</p>\n'
        )
    })

    it('should show the image\'s alt text with typographic punctuation', () => {
        expect(render('![It\'s -- here](a.png)')).toBe('<p><img src="a.png" alt="It’s – here" /></p>\n')
    })

    it('should leave the text as it is without smart punctuation', () => {
        const plain = new Parser()

        expect(renderer.render(plain.parse('"It\'s" -- one...'))).toBe('<p>&quot;It\'s&quot; -- one...</p>\n')
        expect(plain.parse('"It\'s" -- one...').firstChild!.firstChild!.smartLiteral).toBeNull()
    })
})
