import { Parser } from './blocks'
import { BaseNode, CodeNode } from './node'

let reader = new Parser()

describe('paragraph', () => {
    it('simple text', () => {
        const root = reader.parse('Hello World')
        const text = root.firstChild!.firstChild!

        expect(text.sourcepos).toEqual([
            [1, 1],
            [1, 11]
        ])
    })

    it('simple delimiter text', () => {
        const root = reader.parse('<hi')
        const text = root.firstChild!.firstChild!

        expect(text.sourcepos).toEqual([
            [1, 1],
            [1, 3]
        ])
    })

    it('multiple offset', () => {
        const root = reader.parse('  Hello  \n  World')
        const text1 = root.firstChild!.firstChild!
        const linebreak = text1.next!
        const text2 = linebreak.next!

        expect(text1.sourcepos).toEqual([
            [1, 3],
            [1, 7]
        ])
        expect(linebreak.sourcepos).toEqual([
            [1, 8],
            [1, 10]
        ])
        // preceeding whitespaces are not included in text node
        expect(text2.sourcepos).toEqual([
            [2, 3],
            [2, 7]
        ])
    })

    it('text and emphasis', () => {
        const root = reader.parse('Hello *World*')
        const text = root.firstChild!.firstChild!
        const emph = text.next as BaseNode
        const emphText = emph.firstChild!

        expect(text.sourcepos).toEqual([
            [1, 1],
            [1, 6]
        ])
        expect(emph.sourcepos).toEqual([
            [1, 7],
            [1, 13]
        ])
        expect(emphText.sourcepos).toEqual([
            [1, 8],
            [1, 12]
        ])
    })

    it('text and strong emphasis', () => {
        const root = reader.parse('Hello **World**')
        const text = root.firstChild!.firstChild!
        const strong = text.next!
        const strongText = strong.firstChild!

        expect(text.sourcepos).toEqual([
            [1, 1],
            [1, 6]
        ])
        expect(strong.sourcepos).toEqual([
            [1, 7],
            [1, 15]
        ])
        expect(strongText.sourcepos).toEqual([
            [1, 9],
            [1, 13]
        ])
    })

    it('text and image', () => {
        const root = reader.parse('Hello ![World](http://example.com)')
        const text = root.firstChild!.firstChild!
        const image = text.next!
        const imageText = image.firstChild!

        expect(text.sourcepos).toEqual([
            [1, 1],
            [1, 6]
        ])
        expect(image.sourcepos).toEqual([
            [1, 7],
            [1, 34]
        ])
        expect(imageText.sourcepos).toEqual([
            [1, 9],
            [1, 13]
        ])
    })

    it('text with ampersand code ', () => {
        const root = reader.parse('&#91; Hello &#93;')
        const text = root.firstChild!.firstChild!

        expect(text.sourcepos).toEqual([
            [1, 1],
            [1, 17]
        ])
    })

    it('text and link', () => {
        const root = reader.parse('Hello [World](http://example.com)')
        const text = root.firstChild!.firstChild!
        const link = text.next!
        const linkText = link.firstChild!

        expect(text.sourcepos).toEqual([
            [1, 1],
            [1, 6]
        ])
        expect(link.sourcepos).toEqual([
            [1, 7],
            [1, 33]
        ])
        expect(linkText.sourcepos).toEqual([
            [1, 8],
            [1, 12]
        ])
    })

    it('text and codespan', () => {
        const root = reader.parse('Hello ``World``')
        const text = root.firstChild!.firstChild!
        const code = text.next as CodeNode

        expect(text.sourcepos).toEqual([
            [1, 1],
            [1, 6]
        ])
        expect(code.tickCount).toBe(2)
        expect(code.sourcepos).toEqual([
            [1, 7],
            [1, 15]
        ])
    })

    it('text and raw html', () => {
        const root = reader.parse('Hello <strong>World</strong>')
        const text1 = root.firstChild!.firstChild!
        const html1 = text1.next!
        const text2 = html1.next!
        const html2 = text2.next!

        expect(text1.sourcepos).toEqual([
            [1, 1],
            [1, 6]
        ])
        expect(html1.sourcepos).toEqual([
            [1, 7],
            [1, 14]
        ])
        expect(text2.sourcepos).toEqual([
            [1, 15],
            [1, 19]
        ])
        expect(html2.sourcepos).toEqual([
            [1, 20],
            [1, 28]
        ])
    })

    it('autolink', () => {
        const root = reader.parse('Hello <http://example.com>')
        const link = root.firstChild!.firstChild!.next!
        const linkText = link.firstChild!

        expect(link.sourcepos).toEqual([
            [1, 7],
            [1, 26]
        ])
        expect(linkText.sourcepos).toEqual([
            [1, 8],
            [1, 25]
        ])
    })

    it('autolink (mailto)', () => {
        const root = reader.parse('Hello <world@example.com>')
        const link = root.firstChild!.firstChild!.next!
        const linkText = link.firstChild!

        expect(link.sourcepos).toEqual([
            [1, 7],
            [1, 25]
        ])
        expect(linkText.sourcepos).toEqual([
            [1, 8],
            [1, 24]
        ])
    })
})

describe('softbreak and linebreak', () => {
    it('text with softbreak', () => {
        const root = reader.parse('Hello\nWorld')
        const text1 = root.firstChild!.firstChild!
        const softbreak = text1.next!
        const text2 = softbreak.next!

        expect(text1.sourcepos).toEqual([
            [1, 1],
            [1, 5]
        ])
        expect(softbreak.type).toBe('softbreak')
        expect(softbreak.sourcepos).toEqual([
            [1, 6],
            [1, 6]
        ])
        expect(text2.sourcepos).toEqual([
            [2, 1],
            [2, 5]
        ])
    })

    it('text with linebreak(space)', () => {
        const root = reader.parse('Hello   \nWorld')
        const text1 = root.firstChild!.firstChild!
        const linebreak = text1.next!
        const text2 = linebreak.next!

        // trailing spaces are not included in text node
        expect(text1.sourcepos).toEqual([
            [1, 1],
            [1, 5]
        ])
        // preceeding spaces are included in linebreak node
        expect(linebreak.sourcepos).toEqual([
            [1, 6],
            [1, 9]
        ])
        expect(text2.sourcepos).toEqual([
            [2, 1],
            [2, 5]
        ])
    })

    it('text with linebreak(backslash)', () => {
        const root = reader.parse('Hello\\\nWorld')
        const text1 = root.firstChild!.firstChild!
        const linebreak = text1.next!
        const text2 = linebreak.next!

        expect(text1.sourcepos).toEqual([
            [1, 1],
            [1, 5]
        ])
        // preceeding backslash is included in linebreak node
        expect(linebreak.sourcepos).toEqual([
            [1, 6],
            [1, 7]
        ])
        expect(text2.sourcepos).toEqual([
            [2, 1],
            [2, 5]
        ])
    })
})

describe('atx header', () => {
    it('text and emphasis', () => {
        const root = reader.parse('# Hello *World*')
        const text = root.firstChild!.firstChild!
        const emph = text.next!
        const emphText = emph.firstChild!

        expect(text.sourcepos).toEqual([
            [1, 3],
            [1, 8]
        ])
        expect(emph.sourcepos).toEqual([
            [1, 9],
            [1, 15]
        ])
        expect(emphText.sourcepos).toEqual([
            [1, 10],
            [1, 14]
        ])
    })

    it('text and emphasis (header level 3)', () => {
        const root = reader.parse('### Hello *World*')
        const text = root.firstChild!.firstChild!
        const emph = text.next!
        const emphText = emph.firstChild!

        expect(text.sourcepos).toEqual([
            [1, 5],
            [1, 10]
        ])
        expect(emph.sourcepos).toEqual([
            [1, 11],
            [1, 17]
        ])
        expect(emphText.sourcepos).toEqual([
            [1, 12],
            [1, 16]
        ])
    })
})

describe('list items', () => {
    it('with columns', () => {
        const root = reader.parse('   - Hello\n\n     World')
        const listItem = root.firstChild!.firstChild!
        const para1 = listItem.firstChild!
        const para1Text = para1.firstChild!
        const para2 = para1.next!
        const para2Text = para2.firstChild!

        expect(para1Text.sourcepos).toEqual([
            [1, 6],
            [1, 10]
        ])
        expect(para2Text.sourcepos).toEqual([
            [3, 6],
            [3, 10]
        ])
    })

    it('end at their last child, not at the blank lines after it', () => {
        const root = reader.parse('- Hello\n\n- World\n\n\nAfter')
        const list = root.firstChild!
        const item1 = list.firstChild!
        const item2 = item1.next!

        expect(item1.sourcepos).toEqual([
            [1, 1],
            [1, 7]
        ])
        expect(item2.sourcepos).toEqual([
            [3, 1],
            [3, 7]
        ])
        expect(list.sourcepos).toEqual([
            [1, 1],
            [3, 7]
        ])
    })

    it('empty item ends at its marker', () => {
        const root = reader.parse('-\n\n- World')
        const item = root.firstChild!.firstChild!

        expect(item.sourcepos).toEqual([
            [1, 1],
            [1, 2]
        ])
    })

    it('item with a block quote ends at the last quoted line', () => {
        const root = reader.parse('- > - a\n  >\n- b')
        const item = root.firstChild!.firstChild!

        expect(item.sourcepos).toEqual([
            [1, 1],
            [2, 3]
        ])
    })
})

describe('block quote', () => {
    it('nested paragraph', () => {
        const root = reader.parse('> Hello\n> > World')
        const quote1 = root.firstChild!
        const para1 = quote1.firstChild!
        const quote2 = para1.next!
        const para2 = quote2.firstChild!

        expect(para1.firstChild!.sourcepos).toEqual([
            [1, 3],
            [1, 7]
        ])
        expect(para2.firstChild!.sourcepos).toEqual([
            [2, 5],
            [2, 9]
        ])
    })
})

describe('code block', () => {
    it('indented code ends at its last line of code, not at the blank lines after it', () => {
        const root = reader.parse('    foo\n    \n    bar\n\n  \nHello')
        const codeblock = root.firstChild!

        expect(codeblock.sourcepos).toEqual([
            [1, 5],
            [3, 7]
        ])
    })

    it('empty line', () => {
        const root = reader.parse('```\n\n```\nHello')
        const codeblock = root.firstChild!
        const para = codeblock.next!

        expect(codeblock.sourcepos).toEqual([
            [1, 1],
            [3, 3]
        ])
        expect(para.sourcepos).toEqual([
            [4, 1],
            [4, 5]
        ])
    })
})

describe('inlline code', () => {
    it('multi line', () => {
        const root = reader.parse('`a\n  b\n   c`\n d')
        const para = root.firstChild!
        const code = para.firstChild!
        const linebreak = code.next!
        const text = linebreak.next!

        expect(code.sourcepos).toEqual([
            [1, 1],
            [3, 5]
        ])
        expect(linebreak.sourcepos).toEqual([
            [3, 6],
            [3, 6]
        ])
        expect(text.sourcepos).toEqual([
            [4, 2],
            [4, 2]
        ])
    })
})

describe('inline html', () => {
    it('multi line', () => {
        const root = reader.parse('a <?\n  b\n?> c\n d <!--\n-->')
        const para = root.firstChild!
        const text1 = para.firstChild!
        const pi = text1.next!
        const text2 = pi.next!
        const softbreak = text2.next!
        const text3 = softbreak.next!
        const comment = text3.next!

        expect(pi.type).toBe('htmlInline')
        expect(pi.sourcepos).toEqual([
            [1, 3],
            [3, 2]
        ])
        expect(text2.sourcepos).toEqual([
            [3, 3],
            [3, 4]
        ])
        expect(softbreak.sourcepos).toEqual([
            [3, 5],
            [3, 5]
        ])
        expect(text3.sourcepos).toEqual([
            [4, 2],
            [4, 3]
        ])
        expect(comment.type).toBe('htmlInline')
        expect(comment.sourcepos).toEqual([
            [4, 4],
            [5, 3]
        ])
    })
})

describe('merge text nodes', () => {
    it('tokens', () => {
        const root = reader.parse(['\\ Text *', '[ Text !', '![ Text ]'].join('\n'))
        const text1 = root.firstChild!.firstChild!
        const text2 = text1.next!.next!
        const text3 = text2.next!.next!

        expect(text1.literal).toBe('\\ Text *')
        expect(text1.sourcepos).toEqual([
            [1, 1],
            [1, 8]
        ])
        expect(text2.literal).toBe('[ Text !')
        expect(text2.sourcepos).toEqual([
            [2, 1],
            [2, 8]
        ])

        expect(text3.literal).toBe('![ Text ]')
        expect(text3.sourcepos).toEqual([
            [3, 1],
            [3, 9]
        ])
    })
})

describe('reference link definition', () => {
    reader = new Parser({ referenceDefinition: true })

    afterAll(() => {
        reader = new Parser()
    })

    it('single line without title', () => {
        const root = reader.parse('[foo]: test')
        const refDef = root.firstChild!

        expect(refDef.sourcepos).toEqual([
            [1, 1],
            [1, 11]
        ])
    })

    it('single line with title', () => {
        const root = reader.parse('[foo]: test "title"')
        const refDef = root.firstChild!

        expect(refDef.sourcepos).toEqual([
            [1, 1],
            [1, 19]
        ])
    })

    it('multi line without title', () => {
        const root = reader.parse('[foo]:\n  test')
        const refDef = root.firstChild!

        expect(refDef.sourcepos).toEqual([
            [1, 1],
            [2, 4]
        ])
    })

    it('multi line with title', () => {
        const root = reader.parse('[foo]:\n  test "title"')
        const refDef = root.firstChild!

        expect(refDef.sourcepos).toEqual([
            [1, 1],
            [2, 12]
        ])
    })

    it('multi line title which has multi line', () => {
        const root = reader.parse('[foo]:\n  test "\n  tit  \n  l  \n  e"')
        const refDef = root.firstChild!

        expect(refDef.sourcepos).toEqual([
            [1, 1],
            [5, 2]
        ])
    })
})
