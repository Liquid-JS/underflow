import { Renderer } from '../html/renderer'
import { Parser } from './blocks'

// Examples ported from commonmark.js test/regression.txt (and from the
// commits that fixed the corresponding issues), rendered with the same
// parser and renderer options as the CommonMark spec examples.
interface RegressionExample {
    name: string
    markdown: string
    html: string
}

// Builds a string from a code point, so that invisible and line-separator
// characters stay visible in this file.
const ch = (codePoint: number) => String.fromCodePoint(codePoint)

const unicodeSpaces: Array<[string, string]> = [
    [ch(0x0b), 'Vertical Tab'],
    [ch(0x0c), 'Form Feed'],
    [ch(0xa0), 'NBSP (U+00A0) NBSP'],
    [ch(0x2003), 'Em Space (U+2003) Em Space'],
    [ch(0x2028), 'Line Separator (U+2028) Line Separator'],
    [ch(0x2029), 'Paragraph Separator (U+2029) Paragraph Separator'],
    [ch(0x3000), '全角スペース (U+3000) 全形空白'],
    [ch(0xfeff), 'ZWNBSP (U+FEFF) ZWNBSP']
]

const examples: RegressionExample[] = [
    {
        name: 'only ASCII whitespace is trimmed from paragraphs (commonmark.js#261)',
        markdown: unicodeSpaces.map(([space, text]) => `${space}${text}${space}\n`).join('\n'),
        html: unicodeSpaces.map(([space, text]) => `<p>${space}${text}${space}</p>\n`).join('')
    },
    {
        name: 'html comments may end with dashes before --> (commonmark.js#285)',
        markdown: 'foo <!-- test --->\n\nfoo <!-- test ---->\n\nfoo <!----->\n\nfoo <!-- test --> more -->\n',
        html: '<p>foo <!-- test ---></p>\n<p>foo <!-- test ----></p>\n<p>foo <!-----></p>\n<p>foo <!-- test --> more --&gt;</p>\n'
    },
    {
        name: 'processing instructions may contain line endings (commonmark.js#196)',
        markdown: 'a <?\n?>\n',
        html: '<p>a <?\n?></p>\n'
    },
    {
        name: 'declarations do not need a space (cmark#456)',
        markdown: 'x <!A>\n',
        html: '<p>x <!A></p>\n'
    },
    {
        name: 'declarations may be lowercase (commonmark.js#283)',
        markdown: 'x<!x>\n\nx<!>\n',
        html: '<p>x<!x></p>\n<p>x&lt;!&gt;</p>\n'
    },
    {
        name: 'CDATA sections are case-sensitive (commonmark.js#193)',
        markdown: 'x <![CDATA[a]]> <![cdata[b]]>\n',
        html: '<p>x <![CDATA[a]]> &lt;![cdata[b]]&gt;</p>\n'
    },
    {
        name: 'search is an html block tag, source is not (CommonMark 0.31)',
        markdown: '<search>\n*a*\n\n<source> *b*\n',
        html: '<search>\n*a*\n<p><source> <em>b</em></p>\n'
    },
    {
        name: '<!doctype is case-insensitive',
        markdown: '<!docType html>\n',
        html: '<!docType html>\n'
    },
    {
        name: 'type 7 html blocks cannot interrupt a lazy paragraph continuation (commonmark.js#213)',
        markdown: '- <script>\n- some text\nsome other text\n</script>\n',
        html: '<ul>\n<li>\n<script>\n</li>\n<li>some text\nsome other text\n</script></li>\n</ul>\n'
    },
    {
        name: 'link label with backslash before a line ending (commonmark.js#211)',
        markdown: '[\\\nfoo]: /uri\n\n[\\\nfoo]\n',
        html: '<p><a href="/uri"><br />\nfoo</a></p>\n'
    },
    {
        name: 'all runs of whitespace in link labels are collapsed',
        markdown: '[foo][one two\n  three]\n\n[one two three]: /url "title"\n',
        html: '<p><a href="/url" title="title">foo</a></p>\n'
    },
    {
        name: 'dotless i (U+0131) is not folded to ASCII i',
        markdown: '[I]: /a\n\n[ı]: /b\n\n[a][i] [b][ı]\n',
        html: '<p><a href="/a">a</a> <a href="/b">b</a></p>\n'
    },
    {
        name: 'labels containing dotless i still fold their other characters',
        markdown: '[FIQ]: /a\n\n[Fıq]: /b\n\n[a][fiq] [b][fıQ]\n',
        html: '<p><a href="/a">a</a> <a href="/b">b</a></p>\n'
    },
    {
        name: 'a dotless i reference does not resolve against an ASCII I definition',
        markdown: '[I]: /a\n\n[ı]\n',
        html: '<p>[ı]</p>\n'
    },
    {
        name: 'emphasis closers that can open keep their own opener bottom (cmark#383)',
        markdown: '*****Hello*world****\n',
        html: '<p>**<em><strong>Hello<em>world</em></strong></em></p>\n'
    },
    {
        name: 'underscore opener bottoms are tracked mod 3 like asterisks',
        markdown: '__!_!__\n\n__!x!__\n\n**!*!**\n\n---\n\n_*__*_*\n\n_*xx*_*\n\n_*__-_-\n\n_*xx-_-\n',
        html: '<p><strong>!_!</strong></p>\n<p><strong>!x!</strong></p>\n<p><strong>!*!</strong></p>\n<hr />\n<p><em><em>__</em></em>*</p>\n<p><em><em>xx</em></em>*</p>\n<p><em>*__-</em>-</p>\n<p><em>*xx-</em>-</p>\n'
    },
    {
        name: 'no duplicate language- prefix in code block classes (commonmark.js#277)',
        markdown: '```language-r\nx <- 1\n```\n\n```r\nx <- 1\n```\n',
        html: '<pre><code class="language-r">x &lt;- 1\n</code></pre>\n<pre><code class="language-r">x &lt;- 1\n</code></pre>\n'
    },
    {
        name: 'entity references must be complete (commonmark.js#278)',
        markdown: '&parag;\n\n&para\n\n&para;\n',
        html: '<p>&amp;parag;</p>\n<p>&amp;para</p>\n<p>¶</p>\n'
    },
    {
        name: 'unknown entity names are not decoded by prefix in link destinations',
        markdown: '[a](/&parag;)\n',
        html: '<p><a href="/&amp;parag;">a</a></p>\n'
    },
    {
        name: 'entities inside autolinks (commonmark.js#263)',
        markdown: '<http://&gt;>\n',
        html: '<p><a href="http://%3E">http://&gt;</a></p>\n'
    },
    {
        name: 'an empty title not at the line end is discarded (commonmark.js#281)',
        markdown: '[test]:example\n""third [test]\n',
        html: '<p>&quot;&quot;third <a href="example">test</a></p>\n'
    },
    {
        name: 'unicode symbols, including non-BMP ones, count as punctuation for flanking (commonmark.js#296)',
        markdown: 'a**a∇**a\n\na**∇a**a\n\na**a𝜵**a\n\na**𝜵a**a\n',
        html: '<p>a**a∇**a</p>\n<p>a**∇a**a</p>\n<p>a**a𝜵**a</p>\n<p>a**𝜵a**a</p>\n'
    },
    {
        name: 'an isolated low surrogate before a delimiter run (commonmark.js#299)',
        markdown: `${ch(0xdc00)}**a** a${ch(0xdc00)}**b**\n`,
        html: `<p>${ch(0xdc00)}<strong>a</strong> a${ch(0xdc00)}<strong>b</strong></p>\n`
    },
    {
        name: 'non-BMP punctuation before a delimiter run',
        markdown: `a${ch(0x1f600)}**b** c**${ch(0x1d735)}**d\n`,
        html: `<p>a${ch(0x1f600)}<strong>b</strong> c**${ch(0x1d735)}**d</p>\n`
    },
    {
        name: 'spaces on blank lines are kept in fenced code inside list items (commonmark.js#212)',
        markdown: '- ```\n    \n  ```\n\n```\n  \n```\n',
        html: '<ul>\n<li>\n<pre><code>  \n</code></pre>\n</li>\n</ul>\n<pre><code>  \n</code></pre>\n'
    },
    {
        name: 'fenced code info strings are unescaped before trimming (commonmark.js#255)',
        markdown: '```&#x9;js\n```\n```&#x20;js\n```\n``` js\n```\n```js&#x9;\n```\n```js&#x20;\n```\n```js \n```\n```js&#x9;a\n```\n```js&#x20;a\n```\n```js a\n```\n',
        html: '<pre><code class="language-js"></code></pre>\n<pre><code class="language-js"></code></pre>\n<pre><code class="language-js"></code></pre>\n<pre><code class="language-js"></code></pre>\n<pre><code class="language-js"></code></pre>\n<pre><code class="language-js"></code></pre>\n<pre><code class="language-js"></code></pre>\n<pre><code class="language-js"></code></pre>\n<pre><code class="language-js"></code></pre>\n'
    },
    {
        name: 'closing code fence may be followed by tabs (commonmark.js#258)',
        markdown: '```\nabc\n```\t \t\n',
        html: '<pre><code>abc\n</code></pre>\n'
    },
    {
        name: 'an ordered list starting at 01 can interrupt a paragraph (commonmark.js#207)',
        markdown: 'a\n01. b\n',
        html: '<p>a</p>\n<ol>\n<li>b</li>\n</ol>\n'
    },
    {
        name: 'setext heading definitions do not take precedence over earlier ones (commonmark.js#298)',
        markdown: '[x]: fizz\n\n[x]: buzz\n===\n[x]\n',
        html: '<p>===\n<a href="fizz">x</a></p>\n'
    },
    {
        name: 'setext heading definitions are resolved in document order (commonmark.js#298)',
        markdown: '[x]: fizz\n\n[x]: buzz\nTitle\n===\n[x]\n',
        html: '<h1>Title</h1>\n<p><a href="fizz">x</a></p>\n'
    },
    {
        name: 'definitions alone before a thematic break leave no empty paragraph (commonmark.js#262)',
        markdown: '[a]: b\n---\n',
        html: '<hr />\n'
    },
    {
        name: 'a definition alone cannot form a setext heading (commonmark.js#262)',
        markdown: '[a]: b\n===\n',
        html: '<p>===</p>\n'
    },
    {
        name: 'definitions around a thematic break leave no empty paragraph or heading (commonmark.js#262)',
        markdown: '[a]: b\n---\n\n[a]: b\n===\n',
        html: '<hr />\n<p>===</p>\n'
    },
    {
        name: 'a definition before a setext heading remains available (commonmark.js#262)',
        markdown: '[a]: b\nFoo\n---\n\n[a]\n',
        html: '<h2>Foo</h2>\n<p><a href="b">a</a></p>\n'
    },
    {
        name: 'a partially consumed tab does not eat the next character',
        markdown: '* foo\n\tbar\n',
        html: '<ul>\n<li>foo\nbar</li>\n</ul>\n'
    },
    {
        name: 'type 7 html block followed by whitespace (commonmark.js#98)',
        markdown: '<a>  \nx\n',
        html: '<a>  \nx\n'
    },
    {
        name: 'h2..h6 raw html blocks (CommonMark#430)',
        markdown: '<h1>lorem</h1>\n\n<h2>lorem</h2>\n\n<h3>lorem</h3>\n\n<h4>lorem</h4>\n\n<h5>lorem</h5>\n\n<h6>lorem</h6>\n',
        html: '<h1>lorem</h1>\n<h2>lorem</h2>\n<h3>lorem</h3>\n<h4>lorem</h4>\n<h5>lorem</h5>\n<h6>lorem</h6>\n'
    },
    {
        name: 'tabs after a setext heading line (commonmark.js#109)',
        markdown: 'hi\n--\t\n',
        html: '<h2>hi</h2>\n'
    },
    {
        name: 'chinese punctuation is punctuation (commonmark.js#108)',
        markdown: '**。**话\n',
        html: '<p>**。**话</p>\n'
    },
    {
        name: 'emphasis parsing (cmark#177)',
        markdown: 'a***b* c*\n',
        html: '<p>a*<em><em>b</em> c</em></p>\n'
    },
    {
        name: 'backslash at the end of a link definition (CommonMark#468)',
        markdown: '[\\]: test\n',
        html: '<p>[]: test</p>\n'
    },
    {
        name: 'punctuation set (commonmark.js#121)',
        markdown: '^_test_\n',
        html: '<p>^<em>test</em></p>\n'
    },
    {
        name: 'tabs before and after an atx closing sequence (commonmark.js#116)',
        markdown: '# foo\t#\t\n',
        html: '<h1>foo</h1>\n'
    },
    {
        name: 'escaped space is not allowed in a link destination (CommonMark#493)',
        markdown: '[link](a\\ b)\n',
        html: '<p>[link](a\\ b)</p>\n'
    },
    {
        name: 'meta tags in inline contexts (CommonMark#527)',
        markdown: 'City:\n<span itemprop="contentLocation" itemscope itemtype="https://schema.org/City">\n  <meta itemprop="name" content="Springfield">\n</span>\n',
        html: '<p>City:\n<span itemprop="contentLocation" itemscope itemtype="https://schema.org/City">\n<meta itemprop="name" content="Springfield">\n</span></p>\n'
    },
    {
        name: 'no double encoding of percent-encoded urls',
        markdown: '[XSS](javascript&amp;colon;alert%28&#039;XSS&#039;%29)\n',
        html: "<p><a href=\"javascript&amp;colon;alert%28'XSS'%29\">XSS</a></p>\n"
    },
    {
        name: 'percent-encoding of urls (commonmark.js#179)',
        markdown: '[link](https://www.example.com/home/%25batty)\n',
        html: '<p><a href="https://www.example.com/home/%25batty">link</a></p>\n'
    },
    {
        name: 'script, pre and style close tags without an opener (CommonMark#517)',
        markdown: '</script>\n\n</pre>\n\n</style>\n',
        html: '</script>\n</pre>\n</style>\n'
    },
    {
        name: 'pointy-bracket destination containing a closing paren (commonmark.js#289)',
        markdown: '[a](<b) c>\n',
        html: '<p>[a](&lt;b) c&gt;</p>\n'
    },
    {
        name: 'backslash counts as punctuation (commonmark.js#161)',
        markdown: '*failed to be italic!*\\\ntext\n',
        html: '<p><em>failed to be italic!</em><br />\ntext</p>\n'
    },
    {
        name: 'link reference definitions are blocks when checking list tightness',
        markdown: '## Case 1\n\n- [aaa]: /\n\n  [aaa]: /\n- b\n\n\n## Case 2\n\n- a\n\n  [aaa]: /\n- b\n\n\n## Case 3\n\n- [aaa]: /\n\n  a\n- b\n',
        html: '<h2>Case 1</h2>\n<ul>\n<li></li>\n<li>\n<p>b</p>\n</li>\n</ul>\n<h2>Case 2</h2>\n<ul>\n<li>\n<p>a</p>\n</li>\n<li>\n<p>b</p>\n</li>\n</ul>\n<h2>Case 3</h2>\n<ul>\n<li>\n<p>a</p>\n</li>\n<li>\n<p>b</p>\n</li>\n</ul>\n'
    },
    {
        name: 'blank lines inside block quotes and code blocks don\'t make the parent list loose (commonmark.js df3ea1e)',
        markdown:
      '## Case 1\n\n- > a\n  >\n- b\n\n\n## Case 2\n\n- > - a\n  >\n- b\n\n\n## Case 3\n\n- > > a\n  >\n- b\n\n\n## Case 4\n\n- > # a\n  >\n- b\n\n\n## Case 5\n\n- ```\n  The following line is part of code block.\n\n- b\n\n## Case 6\n\n-     The following line is **not** part of code block.\n      \n- b\n\n## Case 7\n\n- <pre>The following line is part of HTML block.\n\n- </pre>\n- b\n',
        html:
      '<h2>Case 1</h2>\n<ul>\n<li>\n<blockquote>\n<p>a</p>\n</blockquote>\n</li>\n<li>b</li>\n</ul>\n<h2>Case 2</h2>\n<ul>\n<li>\n<blockquote>\n<ul>\n<li>a</li>\n</ul>\n</blockquote>\n</li>\n<li>b</li>\n</ul>\n<h2>Case 3</h2>\n<ul>\n<li>\n<blockquote>\n<blockquote>\n<p>a</p>\n</blockquote>\n</blockquote>\n</li>\n<li>b</li>\n</ul>\n<h2>Case 4</h2>\n<ul>\n<li>\n<blockquote>\n<h1>a</h1>\n</blockquote>\n</li>\n<li>b</li>\n</ul>\n<h2>Case 5</h2>\n<ul>\n<li>\n<pre><code>The following line is part of code block.\n\n</code></pre>\n</li>\n<li>b</li>\n</ul>\n<h2>Case 6</h2>\n<ul>\n<li>\n<pre><code>The following line is **not** part of code block.\n</code></pre>\n</li>\n<li>\n<p>b</p>\n</li>\n</ul>\n<h2>Case 7</h2>\n<ul>\n<li>\n<pre>The following line is part of HTML block.\n\n</li>\n<li>\n</pre>\n</li>\n<li>b</li>\n</ul>\n'
    }
]

const reader = new Parser({ referenceDefinition: true })
const renderer = new Renderer()

examples.forEach(({ name, markdown, html }) => {
    it(name, () => {
        expect(renderer.render(reader.parse(markdown))).toBe(html)
    })
})
