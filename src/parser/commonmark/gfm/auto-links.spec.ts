import { Parser } from '../blocks'
import { Renderer } from '../../html/renderer'
import { LinkNode } from '../node'
import { pos } from '../../../../test/parser'
import { parseUrlLink, parseEmailLink } from './auto-links'

describe('parseUrlLink()', () => {
    // https://github.github.com/gfm/#extended-www-autolink
    // https://github.github.com/gfm/#extended-url-autolink
    it('domain not preceeded by www is invalid', () => {
        expect(parseUrlLink('example.com')).toEqual([])
        expect(parseUrlLink('docs.example.com')).toEqual([])
    })

    it('domain preceeded by www needs no other period, as in GFM', () => {
        expect(parseUrlLink('www.example')).toEqual([
            {
                text: 'www.example',
                url: 'http://www.example',
                range: [0, 10]
            }
        ])
        expect(parseUrlLink('http://localhost')).toEqual([
            {
                text: 'http://localhost',
                url: 'http://localhost',
                range: [0, 15]
            }
        ])
    })

    it('www or the scheme starts the text or follows whitespace or *_~(', () => {
        expect(parseUrlLink('wwwxexample.com')).toEqual([])
        expect(parseUrlLink('abcwww.example.com')).toEqual([])
        expect(parseUrlLink('_www.example.com_')).toEqual([
            {
                text: 'www.example.com',
                url: 'http://www.example.com',
                range: [1, 15]
            }
        ])
    })

    it('domain preceeded by www is valid', () => {
        expect(parseUrlLink('www.example.com')).toEqual([
            {
                text: 'www.example.com',
                url: 'http://www.example.com',
                range: [0, 14]
            }
        ])

        expect(parseUrlLink('Visit www.example.com Now!')).toEqual([
            {
                text: 'www.example.com',
                url: 'http://www.example.com',
                range: [6, 20]
            }
        ])
    })

    it('domain preceeded by http(s):// is valid', () => {
        expect(parseUrlLink('http://example.com')).toEqual([
            {
                text: 'http://example.com',
                url: 'http://example.com',
                range: [0, 17]
            }
        ])

        expect(parseUrlLink('https://example.com')).toEqual([
            {
                text: 'https://example.com',
                url: 'https://example.com',
                range: [0, 18]
            }
        ])
    })

    it('zero or more non-space non-< characters may follow', () => {
        expect(parseUrlLink('www.example.com/help<me')).toEqual([
            {
                text: 'www.example.com/help',
                url: 'http://www.example.com/help',
                range: [0, 19]
            }
        ])
    })

    it('tailing punctuation (?!,.:*_~) is not considered part of the link', () => {
        const pairs = [
            ['www.example.com/?help?', 'www.example.com/?help'],
            ['www.example.com/!help!', 'www.example.com/!help'],
            ['www.example.com/,help,', 'www.example.com/,help'],
            ['www.example.com/.help.', 'www.example.com/.help'],
            ['www.example.com/:help:', 'www.example.com/:help'],
            ['www.example.com/*help*', 'www.example.com/*help'],
            ['www.example.com/~help~', 'www.example.com/~help'],
            ['http://example.com/~help~', 'http://example.com/~help'],
            ['https://example.com/~help~', 'https://example.com/~help']
        ]

        pairs.forEach(([input, text]) => {
            expect(parseUrlLink(input)![0].text).toBe(text)
        })
    })

    it('trailing closing parens without matching opening parens are excluded', () => {
        const pairs = [
            ['www.example.com/(ui)', 'www.example.com/(ui)'],
            ['www.example.com/(ui))', 'www.example.com/(ui)'],
            ['(www.example.com/(ui))', 'www.example.com/(ui)'],
            ['(www.example.com/((ui))', 'www.example.com/((ui))'],
            ['(www.example.com/(ui)', 'www.example.com/(ui)'],
            ['(www.example.com/)))(ui))', 'www.example.com/)))(ui)'],
            ['(http://example.com/)))(ui))', 'http://example.com/)))(ui)'],
            ['(https://example.com/)))(ui))', 'https://example.com/)))(ui)']
        ]

        pairs.forEach(([input, text]) => {
            expect(parseUrlLink(input)![0].text).toBe(text)
        })
    })

    it('trailing entity-like pattern (&xxx;) are excluded', () => {
        const pairs = [
            ['www.example.com/ui&editor;grid', 'www.example.com/ui&editor;grid'],
            ['www.example.com/ui&grid;', 'www.example.com/ui'],
            ['www.example.com/ui&?grid;', 'www.example.com/ui&?grid;'],
            ['http://example.com/ui&?grid;', 'http://example.com/ui&?grid;'],
            ['https://example.com/ui&?grid;', 'https://example.com/ui&?grid;']
        ]

        pairs.forEach(([input, text]) => {
            expect(parseUrlLink(input)![0].text).toBe(text)
        })
    })

    it('should handle multiple occurrences', () => {
        expect(parseUrlLink('Hello www.example.com and http://example.org')).toEqual([
            {
                text: 'www.example.com',
                url: 'http://www.example.com',
                range: [6, 20]
            },
            {
                text: 'http://example.org',
                url: 'http://example.org',
                range: [26, 43]
            }
        ])
    })
})

describe('parseEmailLink', () => {
    it('simple example', () => {
        expect(parseEmailLink('ui@example.org')).toEqual([
            {
                text: 'ui@example.org',
                url: 'mailto:ui@example.org',
                range: [0, 13]
            }
        ])

        expect(parseEmailLink('Hello ui@example.org guys')).toEqual([
            {
                text: 'ui@example.org',
                url: 'mailto:ui@example.org',
                range: [6, 19]
            }
        ])
    })

    it('+ can occur before the @, but not after.', () => {
        expect(parseEmailLink('ui@to+ast.com')).toEqual([])
        expect(parseEmailLink('u+i@example.org')).toEqual([
            {
                text: 'u+i@example.org',
                url: 'mailto:u+i@example.org',
                range: [0, 14]
            }
        ])
    })

    it('trailing dash(-) and underscore(_) are invalid, trailing dot(.) is excluded ', () => {
        const pairs = [
            ['a.b-c_d@a.b', 'a.b-c_d@a.b'],
            ['a.b-c_d@a.b.', 'a.b-c_d@a.b']
        ]
        const invalids = ['a.b-c_d@a.b-', 'a.b-c_d@a.b_']

        pairs.forEach(([input, text]) => {
            expect(parseEmailLink(input)![0].text).toBe(text)
        })
        invalids.forEach((input) => {
            expect(parseEmailLink(input)).toEqual([])
        })
    })

    it('should handle multiple occurrences', () => {
        expect(parseEmailLink('Hello ui@example.org and file@example.org')).toEqual([
            {
                text: 'ui@example.org',
                url: 'mailto:ui@example.org',
                range: [6, 19]
            },
            {
                text: 'file@example.org',
                url: 'mailto:file@example.org',
                range: [25, 40]
            }
        ])
    })
})

describe('custom autolink parser', () => {
    const renderer = new Renderer()
    const reader = new Parser({
        extendedAutolinks: (content) => {
            const regex = /\d{3}/g
            const result = []
            let matched

            while ((matched = regex.exec(content))) {
                const { index } = matched
                const text = matched[0]
                const range: [number, number] = [index, index + text.length - 1]
                const url = `num:${text}`

                result.push({ text, url, range })
            }
            return result
        }
    })

    it('should parse custom pattern', () => {
        const root = reader.parse('A 111 B 222')
        const para = root.firstChild!
        const link1 = para.firstChild!.next!
        const link2 = link1.next!.next!

        expect(link1).toMatchObject({
            destination: 'num:111',
            extendedAutolink: true,
            sourcepos: pos(1, 3, 1, 5),
            firstChild: {
                literal: '111'
            }
        })

        expect(link2).toMatchObject({
            destination: 'num:222',
            extendedAutolink: true,
            sourcepos: pos(1, 9, 1, 11),
            firstChild: {
                literal: '222'
            }
        })

        expect(renderer.render(root)).toBe(
            '<p>A <a href="num:111">111</a> B <a href="num:222">222</a></p>\n'
        )
    })
})

// https://github.github.com/gfm/#example-621
describe('GFM Examples', () => {
    const reader = new Parser({ extendedAutolinks: true })
    const renderer = new Renderer()

    it('621', () => {
        const root = reader.parse('www.commonmark.org')
        const link = root.firstChild!.firstChild as LinkNode
        const linkText = link.firstChild!

        expect(link).toMatchObject({
            type: 'link',
            destination: 'http://www.commonmark.org',
            extendedAutolink: true,
            sourcepos: pos(1, 1, 1, 18)
        })

        expect(linkText).toMatchObject({
            literal: 'www.commonmark.org',
            sourcepos: pos(1, 1, 1, 18)
        })

        const html = renderer.render(root)
        expect(html).toBe('<p><a href="http://www.commonmark.org">www.commonmark.org</a></p>\n')
    })

    it('622', () => {
        const root = reader.parse('Visit www.commonmark.org/help for more information.')
        const text1 = root.firstChild!.firstChild!
        const link = text1.next as LinkNode
        const linkText = link.firstChild!
        const text2 = link.next!

        expect(text1.literal).toBe('Visit ')
        expect(link).toMatchObject({
            type: 'link',
            extendedAutolink: true,
            destination: 'http://www.commonmark.org/help',
            sourcepos: pos(1, 7, 1, 29)
        })

        expect(linkText.literal).toBe('www.commonmark.org/help')
        expect(linkText.sourcepos).toEqual(pos(1, 7, 1, 29))

        expect(text2.literal).toBe(' for more information.')
        expect(text2.sourcepos).toEqual(pos(1, 30, 1, 51))

        const html = renderer.render(root)
        expect(html).toBe(
            '<p>Visit <a href="http://www.commonmark.org/help">www.commonmark.org/help</a> for more information.</p>\n'
        )
    })

    const examples = [
        {
            no: 623,
            input: ['Visit www.commonmark.org.\n\n', 'Visit www.commonmark.org/a.b.'].join(''),
            output: [
                '<p>Visit <a href="http://www.commonmark.org">www.commonmark.org</a>.</p>\n',
                '<p>Visit <a href="http://www.commonmark.org/a.b">www.commonmark.org/a.b</a>.</p>\n'
            ].join('')
        },
        {
            no: 624,
            input: [
                'www.google.com/search?q=Markup+(business)\n\n',
                'www.google.com/search?q=Markup+(business)))\n\n',
                '(www.google.com/search?q=Markup+(business))\n\n',
                '(www.google.com/search?q=Markup+(business)'
            ].join(''),
            output: [
                '<p><a href="http://www.google.com/search?q=Markup+(business)">',
                'www.google.com/search?q=Markup+(business)</a></p>\n',
                '<p><a href="http://www.google.com/search?q=Markup+(business)">',
                'www.google.com/search?q=Markup+(business)</a>))</p>\n',
                '<p>(<a href="http://www.google.com/search?q=Markup+(business)">',
                'www.google.com/search?q=Markup+(business)</a>)</p>\n',
                '<p>(<a href="http://www.google.com/search?q=Markup+(business)">',
                'www.google.com/search?q=Markup+(business)</a></p>\n'
            ].join('')
        },
        {
            no: 625,
            input: 'www.google.com/search?q=(business))+ok',
            output: [
                '<p><a href="http://www.google.com/search?q=(business))+ok">',
                'www.google.com/search?q=(business))+ok</a></p>\n'
            ].join('')
        },
        {
            no: 626,
            input: [
                'www.google.com/search?q=commonmark&hl=en\n\n',
                'www.google.com/search?q=commonmark&hl;'
            ].join(''),
            output: [
                '<p><a href="http://www.google.com/search?q=commonmark&amp;hl=en">',
                'www.google.com/search?q=commonmark&amp;hl=en</a></p>\n',
                '<p><a href="http://www.google.com/search?q=commonmark">',
                'www.google.com/search?q=commonmark</a>&amp;hl;</p>\n'
            ].join('')
        },
        {
            no: 627,
            input: 'www.commonmark.org/he<lp',
            output: '<p><a href="http://www.commonmark.org/he">www.commonmark.org/he</a>&lt;lp</p>\n'
        },
        {
            no: 628,
            input: [
                'http://commonmark.org\n\n',
                '(Visit https://encrypted.google.com/search?q=Markup+(business))'
            ].join(''),
            output: [
                '<p><a href="http://commonmark.org">http://commonmark.org</a></p>\n',
                '<p>(Visit <a href="https://encrypted.google.com/search?q=Markup+(business)">',
                'https://encrypted.google.com/search?q=Markup+(business)</a>)</p>\n'
            ].join('')
        },
        {
            no: 629,
            input: 'foo@bar.baz',
            output: '<p><a href="mailto:foo@bar.baz">foo@bar.baz</a></p>\n'
        },
        {
            no: 630,
            input: 'hello@mail+xyz.example isn\'t valid, but hello+xyz@mail.example is.',
            output: [
                '<p>hello@mail+xyz.example isn\'t valid, but ',
                '<a href="mailto:hello+xyz@mail.example">hello+xyz@mail.example</a> is.</p>\n'
            ].join('')
        },
        {
            no: 631,
            input: ['a.b-c_d@a.b\n\n', 'a.b-c_d@a.b.\n\n', 'a.b-c_d@a.b-\n\n', 'a.b-c_d@a.b_'].join(''),
            output: [
                '<p><a href="mailto:a.b-c_d@a.b">a.b-c_d@a.b</a></p>\n',
                '<p><a href="mailto:a.b-c_d@a.b">a.b-c_d@a.b</a>.</p>\n',
                '<p>a.b-c_d@a.b-</p>\n',
                '<p>a.b-c_d@a.b_</p>\n'
            ].join('')
        }
    ]

    examples.forEach(({ no, input, output }) => {
        it(String(no), () => {
            const root = reader.parse(input)
            const html = renderer.render(root)
            expect(html).toBe(output)
        })
    })
})
