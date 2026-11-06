import { Renderer } from '../html/renderer'
import { Parser } from './blocks'

// Inputs that used to make the parser take exponential or quadratic time.
// Ported from commonmark.js test/test.js ("Pathological cases").
const reader = new Parser({ referenceDefinition: true })
const renderer = new Renderer()

interface PathologicalCase {
    name: string
    markdown: string
    html: string
}

const cases: PathologicalCase[] = [
    {
        name: 'backslashes in unclosed link title',
        markdown: `[test](\\url "${'\\'.repeat(1000)}\n`,
        html: `<p>[test](\\url &quot;${'\\'.repeat(500)}</p>\n`
    },
    {
        name: 'thematic break candidate followed by many spaces',
        markdown: `_ _ _${' '.repeat(100000)}x`,
        html: `<p>_ _ _${' '.repeat(100000)}x</p>\n`
    }
]

const x = 10000

cases.push(
    {
        name: `nested strong emph ${x} deep`,
        markdown: '*a **a '.repeat(x) + 'b' + ' a** a*'.repeat(x),
        html: `<p>${'<em>a <strong>a '.repeat(x)}b${' a</strong> a</em>'.repeat(x)}</p>\n`
    },
    {
        name: `${x} emph closers with no openers`,
        markdown: 'a_ '.repeat(x),
        html: `<p>${'a_ '.repeat(x - 1)}a_</p>\n`
    },
    {
        name: `${x} emph openers with no closers`,
        markdown: '_a '.repeat(x),
        html: `<p>${'_a '.repeat(x - 1)}_a</p>\n`
    },
    {
        name: `${x} openers and closers multiple of 3`,
        markdown: `a**b${'c* '.repeat(x)}`,
        html: `<p>a**b${'c* '.repeat(x - 1)}c*</p>\n`
    },
    {
        name: `${x} #172`,
        markdown: '*_* _ '.repeat(x),
        html: `<p>${'<em>_</em> _ '.repeat(x - 1)}<em>_</em> _</p>\n`
    },
    {
        name: `${x} link closers with no openers`,
        markdown: 'a] '.repeat(x),
        html: `<p>${'a] '.repeat(x - 1)}a]</p>\n`
    },
    {
        name: `${x} link openers with no closers`,
        markdown: '[a '.repeat(x),
        html: `<p>${'[a '.repeat(x - 1)}[a</p>\n`
    },
    {
        name: `${x} link openers and emph closers`,
        markdown: '[ a_ '.repeat(x),
        html: `<p>${'[ a_ '.repeat(x - 1)}[ a_</p>\n`
    },
    {
        name: `${x} mismatched openers and closers`,
        markdown: '*a_ '.repeat(x),
        html: `<p>${'*a_ '.repeat(x - 1)}*a_</p>\n`
    },
    {
        name: `${x} pattern [ (](`,
        markdown: '[ (]('.repeat(x),
        html: `<p>${'[ (]('.repeat(x)}</p>\n`
    },
    {
        name: `nested brackets ${x} deep`,
        markdown: `${'['.repeat(x)}a${']'.repeat(x)}`,
        html: `<p>${'['.repeat(x)}a${']'.repeat(x)}</p>\n`
    },
    {
        name: `nested block quote ${x} deep`,
        markdown: `${'> '.repeat(x)}a\n`,
        html: `${'<blockquote>\n'.repeat(x)}<p>a</p>\n${'</blockquote>\n'.repeat(x)}`
    },
    {
        name: `[\\... ${x} deep`,
        markdown: `[${'\\'.repeat(x)}\n`,
        html: `<p>[${'\\'.repeat(x / 2)}</p>\n`
    }
)

cases.forEach(({ name, markdown, html }) => {
    it(name, () => {
        const start = Date.now()
        const result = renderer.render(reader.parse(markdown))

        expect(result).toBe(html)
        expect(Date.now() - start).toBeLessThan(1000)
    })
})
