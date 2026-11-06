import { source, oneLineTrim } from 'common-tags'

import { DOMSerializer, Node, Schema } from 'prosemirror-model'

import { ToMdConvertorMap, ToMdConvertorContext, NodeInfo, MarkInfo } from '../types/convertor'
import { createSpecs } from '../wysiwyg/spec-creator'

import { WwToDOMAdaptor } from '../wysiwyg/adaptor/ww-to-dom-adaptor'
import { EventEmitter } from '../event/event-emitter'

import { createHTMLSchemaMap } from '../wysiwyg/nodes/html'
import { sanitizeHTML } from '../sanitizer/html-sanitizer'
import { createHTMLrenderer } from '../../../test/markdown'
import { Context, HTMLConvertorMap } from '../../parser/types/renderer'
import { MdNode } from '../../parser/types/node'
import { Parser } from '../../parser/commonmark/blocks'
import { Convertor } from './convertor'

function createSchema() {
    const specs = createSpecs({})

    return new Schema({
        nodes: specs.nodes,
        marks: specs.marks
    })
}

describe('Convertor', () => {
    let convertor: Convertor
    let schema: Schema

    const parser = new Parser({
        disallowedHtmlBlockTags: ['br', 'img']
    })

    function assertConverting(markdown: string, expected: string) {
        const mdNode = parser.parse(markdown)

        const wwNode = convertor.toWysiwygModel(mdNode)
        const result = convertor.toMarkdownText(wwNode!)

        expect(result).toBe(expected)
    }

    beforeEach(() => {
        schema = createSchema()
        convertor = new Convertor(schema, {}, {}, new EventEmitter())
    })

    describe('should convert between markdown and wysiwyg node to', () => {
        it('empty content', () => {
            assertConverting('', '')
        })

        it('paragraph', () => {
            const markdown = 'foo'

            assertConverting(markdown, markdown)
        })

        it('headings', () => {
            const markdown = source`
        # heading1
        ## heading2
        ### heading3
        #### heading4
        ##### heading5
        ###### heading6
      `
            const expected = source`
        # heading1
        
        ## heading2
        
        ### heading3
        
        #### heading4
        
        ##### heading5
        
        ###### heading6
      `

            assertConverting(markdown, expected)
        })

        it('codeBlock', () => {
            const markdown = source`
        \`\`\`
        foo
        \`\`\`
      `

            assertConverting(markdown, markdown)
        })

        it('bullet list', () => {
            const markdown = source`
        * foo
        * bar
            * qux
        * baz
    	`

            assertConverting(markdown, markdown)
        })

        it('ordered list', () => {
            const markdown = source`
        1. foo
        2. bar
        3. baz
    	`

            assertConverting(markdown, markdown)
        })

        it('blockQuote', () => {
            const markdown = source`
        > foo
        > bar
        >> baz
        > > qux
        > >> quxx
      `
            const expected = source`
        > foo
        > bar
        > > baz
        > > qux
        > > > quxx
      `

            assertConverting(markdown, expected)
        })

        it('thematicBreak', () => {
            const markdown = source`
        ---
        ***
        - - -
        * * * *
    	`
            const expected = source`
        ***
        
        ***
        
        ***
        
        ***
      `

            assertConverting(markdown, expected)
        })

        it('image', () => {
            const markdown = source`
        ![](imgUrl)
        ![altText](imgUrl)
        ![altText](img*Url)
        ![altText](url?key=abc&attribute=abc)
        `
            const expected = source`
        ![](imgUrl)
        ![altText](imgUrl)
        ![altText](img*Url)
        ![altText](url?key=abc&attribute=abc)
    	`

            assertConverting(markdown, expected)
        })

        it('image with title', () => {
            const markdown = source`
        ![altText](imgUrl "title")
        ![altText](imgUrl 'title "with" quotes')
      `

            assertConverting(markdown, markdown)
        })

        it('link', () => {
            const markdown = source`
        [](url)foo
        [text](url)
        [text](ur*l)
        [Editor](https://github.com/example/editor)
        [this.is_a_test_link.com](this.is_a_test_link.com)
        [text](url?key=abc&attribute=abc)
        `
            const expected = source`
        foo
        [text](url)
        [text](ur*l)
        [Editor](https://github.com/example/editor)
        [this.is_a_test_link.com](this.is_a_test_link.com)
        [text](url?key=abc&attribute=abc)
    	`

            assertConverting(markdown, expected)
        })

        it('code', () => {
            const markdown = '`foo bar baz`'

            assertConverting(markdown, markdown)
        })

        it('emphasis (strong, italic) syntax', () => {
            const markdown = source`
        **foo**
        __bar__
        *baz*
        _qux_
    	`
            const expected = source`
        **foo**
        **bar**
        *baz*
        *qux*
    	`

            assertConverting(markdown, expected)
        })

        it('strike', () => {
            const markdown = '~~strike~~'

            assertConverting(markdown, markdown)
        })

        it('table', () => {
            const markdown = source`
        | thead | thead |
        | --- | --- |
        | tbody | tbody |

        | thead |thead |
        | -- | ----- |
        | tbody|tbody|
        | tbody|tbody|

        |||
        |-|-|
        |||
      `
            const expected = source`
        | thead | thead |
        | ----- | ----- |
        | tbody | tbody |

        | thead | thead |
        | ----- | ----- |
        | tbody | tbody |
        | tbody | tbody |

        |  |  |
        | --- | --- |
        |  |  |
      `

            assertConverting(markdown, `${expected}\n`)
        })

        it('table with column align syntax', () => {
            const markdown = source`
        | default | left | right | center |
        | --- | :--- | ---: | :---: |
        | tbody | tbody | tbody | tbody |

        |  |  |  |  |
        | --- | :--- | ---: | :---: |
        | default | left | right | center |
      `
            const expected = source`
        | default | left | right | center |
        | ------- | :--- | ----: | :----: |
        | tbody | tbody | tbody | tbody |

        |  |  |  |  |
        | --- | :--- | ---: | :---: |
        | default | left | right | center |
      `

            assertConverting(markdown, `${expected}\n`)
        })

        it('table with inline syntax', () => {
            const markdown = source`
        | ![altText](imgUrl) | foo ![altText](imgUrl) baz |
        | ---- | ---- |
        | [linkText](linkUrl) | foo [linkText](linkUrl) baz |
        | **foo** _bar_ ~~baz~~ | **foo** *bar* ~~baz~~ [linkText](linkUrl) |
      `
            const expected = source`
        | ![altText](imgUrl) | foo ![altText](imgUrl) baz |
        | --- | -------- |
        | [linkText](linkUrl) | foo [linkText](linkUrl) baz |
        | **foo** *bar* ~~baz~~ | **foo** *bar* ~~baz~~ [linkText](linkUrl) |
      `

            assertConverting(markdown, `${expected}\n`)
        })

        // @TODO: should normalize table cell
        // it('should normalize wrong table syntax when converting', () => {
        //   const markdown = source`
        //     | col1 | col2 | col3 |
        //     | --- | --- |
        //     | cell1 | cell2 | cell3 |
        //   `;
        //   const expected = source`
        //     | col1 | col2 | col3 |
        //     | ---- | ---- | ---- |
        //     | cell1 | cell2 |  |
        //   `;

        //   assertConverting(markdown, `${expected}\n`);
        // });

        it('task', () => {
            const markdown = source`
        * [ ] foo
            * [x] baz
        * [x] bar
        
        1. [x] foo
        2. [ ] bar
      `

            assertConverting(markdown, markdown)
        })

        it('list in blockQuote', () => {
            const markdown = source`
        > * foo
        >   * baz
        > * bar
        >> 1. qux
        > > 2. quxx 
      `
            const expected = source`
        > * foo
        >     * baz
        > * bar
        > > 1. qux
        > > 2. quxx 
      `

            assertConverting(markdown, expected)
        })

        it('block nodes in list', () => {
            const markdown = source`
        1. foo

            \`\`\`
            bar
            \`\`\`
        
            > bam
      `
            const expected = source`
        1. foo

            \`\`\`
            bar
            \`\`\`
        
            > bam
      `

            assertConverting(markdown, expected)
        })

        it('soft break', () => {
            const markdown = source`
        foo
        bar

        baz



        qux
      `

            const expected = source`
        foo
        bar

        baz

        qux
      `

            assertConverting(markdown, expected)
        })

        it('<br> lines become backslash lines', () => {
            const markdown = source`
        foo
        <br>
        bar
        <br>
        <br>
        baz
        <br>
        <br>
        <br>
        qux
      `
            const expected = source`
        foo
        
        bar

        \\
        baz

        \\
        \\
        qux
      `

            assertConverting(markdown, expected)
        })

        it('<br> lines with soft breaks become backslash lines', () => {
            const markdown = source`
        foo

        <br>
        bar
        
        <br>
        <br>
        baz
        

        <br>
        qux
        <br>

        quux

        <br>

        quuz
      `
            const expected = source`
        foo
        
        \\
        bar

        \\
        \\
        baz

        \\
        qux

        \\
        quux

        \\
        \\
        quuz
      `

            assertConverting(markdown, expected)
        })

        it('<br> on the first lines', () => {
            assertConverting('<br>\nfoo', '\\\nfoo')
            // markdown can't express empty lines that no text follows
            assertConverting('<br>\n<br>\n<br>', '')
        })

        it('<br> with html inline node', () => {
            const markdown = source`
        foo
        bar
        Para       <b>Word</b><br>
      `
            const expected = source`
        foo
        bar
        Para <b>Word</b>
      `

            assertConverting(markdown, expected)
        })

        it('<br> with following <br>', () => {
            const markdown = source`
        text1
        <br>
        text2<br>
        <br>
        text3
      `
            const expected = source`
        text1
        
        text2
        
        text3
      `

            assertConverting(markdown, expected)
        })

        it('<br> in the middle of the paragraph', () => {
            const markdown = source`
        text1
        <br>
        te<br>xt2<br>
        <br>
        text3
      `
            const expected = source`
        text1
        
        te
        xt2
        
        text3
      `

            assertConverting(markdown, expected)
        })

        it('should convert html comment', () => {
            const markdown = source`
        <!--
        foo

        bar
        baz
        -->
      `

            assertConverting(markdown, markdown)
        })

        it('should convert html comments allowed by CommonMark 0.31', () => {
            const markdown = source`
        <!-->

        <!--->

        <!-- foo -- bar -->
      `

            assertConverting(markdown, markdown)
        })

        it('should use the first row as the head of an html table without <thead>', () => {
            assertConverting(
                '<table><tr><td>a</td></tr><tr><td>b</td></tr></table>',
                '<table><thead><tr><td>a</td></tr></thead><tbody><tr><td>b</td></tr></tbody></table>'
            )
            assertConverting(
                '<table><tbody><tr><td>a</td></tr></tbody><tbody><tr><td>b</td></tr></tbody></table>',
                '<table><thead><tr><td>a</td></tr></thead><tbody><tr><td>b</td></tr></tbody></table>'
            )
        })

        it('should keep html block indented with spaces', () => {
            // a division has no WYSIWYG node, so it keeps its source
            assertConverting('  <div>foo</div>', '  <div>foo</div>')
            assertConverting('<div>foo</div>', '<div>foo</div>')
        })

        it('should keep the source of html that WYSIWYG can\'t show', () => {
            const iframe = '<iframe src="https://www.youtube.com/embed/x" allowfullscreen></iframe>'

            assertConverting(iframe, iframe)
            assertConverting('<p align="center">x</p>', '<p align="center">x</p>')
            assertConverting('<details>\n\n**more**\n\n</details>', '<details>\n\n**more**\n\n</details>')
            assertConverting('<?php echo 1; ?>', '<?php echo 1; ?>')
            // inline tags too, with their closing tag
            assertConverting(
                'a test with <h1>a header</h1> and <kbd>Ctrl</kbd>',
                'a test with <h1>a header</h1> and <kbd>Ctrl</kbd>'
            )
        })

        it('should convert html comment containing double hyphens or no content', () => {
            assertConverting('<!-- foo -- bar -->', '<!-- foo -- bar -->')
            assertConverting('<!---->', '<!---->')
        })
    })

    describe('convert inline html', () => {
        it('emphasis type', () => {
            const markdown = source`
        <b>foo</b>
        <strong>foo</strong>

        <i>foo</i>
        <em>foo</em>
        
        <s>foo</s>
        <del>foo</del>

        <code>foo</code>
      `

            assertConverting(markdown, markdown)
        })

        it('link type', () => {
            const markdown = source`
        <a href="#">foo</a>

        <img src="#">

        <img src="#" alt="test">

        <img src="#" alt="test" title="title">
      `

            assertConverting(markdown, markdown)
        })

        it('headings in list items and block quotes', () => {
            assertConverting('- # item\n- b', '* # item\n* b')
            assertConverting('> # quote\n> text', '> # quote\n>\n> text')
            assertConverting('- ```\n  code\n  ```\n- b', '* ```\n    code\n    ```\n* b')
            // a line ending in a setext heading is a space
            assertConverting('- a\n  *b\n  c*\n  ---', '* a *b c*\n    ---')
        })

        it('tight and loose lists', () => {
            // tight lists stay tight, also with other blocks in their items
            assertConverting('- a\n- b', '* a\n* b')
            assertConverting(
                '1. a\n2. b\n   ```js\n   x\n   ```\n3. c',
                '1. a\n2. b\n    ```js\n    x\n    ```\n3. c'
            )
            assertConverting('- a\n  > q\n  # h\n- c', '* a\n    > q\n    # h\n* c')
            assertConverting('- a\n  ***\n- c', '* a\n    ***\n* c')
            assertConverting('- a\n  | x |\n  | - |\n  | 1 |\n- c', '* a\n    | x |\n    | --- |\n    | 1 |\n* c')
            // loose lists stay loose, and their paragraphs stay paragraphs
            assertConverting('- a\n\n- b', '* a\n\n* b')
            assertConverting('- a\n\n  b\n- c', '* a\n\n    b\n\n* c')
        })

        it('hard break', () => {
            assertConverting('foo\\\nbar', 'foo\\\nbar')
            assertConverting('foo\\\n\\\nbar', 'foo\\\n\\\nbar')
            assertConverting('*foo\\\nbar*', '*foo\\\nbar*')
            assertConverting('* foo\\\n  bar', '* foo\\\n    bar')
            // two trailing spaces are a hard break too
            assertConverting('foo  \nbar', 'foo\\\nbar')
        })

        it('empty lines as backslash lines', () => {
            assertConverting('foo\n\n\\\n\\\nbar', 'foo\n\n\\\n\\\nbar')
            assertConverting('\\\nfoo', '\\\nfoo')
            assertConverting('* foo\n    \\\n    bar', '* foo\n    \\\n    bar')
            assertConverting('> foo\n> \n> \\\n> bar', '> foo\n>\n> \\\n> bar')
        })

        it('table with <br>', () => {
            const markdown = source`
        | thead<br>thead | thead |
        | ----- | ----- |
        | tbody<br>tbody | tbody |
        | tbody | tbody<br>tbody<br>tbody |
        | tbody | **tbody**<br>_tbody_<br>~~tbody~~<br>\`tbody\` |
        | tbody | ![img](imgUrl)<br>[link](linkUrl) |
      `
            const expected = source`
        | thead<br>thead | thead |
        | ---------- | ----- |
        | tbody<br>tbody | tbody |
        | tbody | tbody<br>tbody<br>tbody |
        | tbody | **tbody**<br>*tbody*<br>~~tbody~~<br>\`tbody\` |
        | tbody | ![img](imgUrl)<br>[link](linkUrl) |
      `

            assertConverting(markdown, `${expected}\n`)
        })

        it('table with only a header row', () => {
            assertConverting('| x |\n| - |\n\nafter', '| x |\n| --- |\n\nafter')
        })

        it('table with escaped pipe in code span', () => {
            const markdown = source`
        | \`a\\|b\` | thead |
        | --- | ----- |
        | \`c\\|d\` | e\\|f |
      `

            assertConverting(markdown, `${markdown}\n`)
        })

        it('table with empty lines and html inline tags around <br>', () => {
            const markdown = source`
        | thead |
        | ----- |
        | a<br><br>b |
        | <br>a |
        | a<br> |
        | <br><br> |
        | <b>bold</b><br>text |
        | text<br><ul><li>bullet</li></ul> |
        | <ul><li>bullet</li></ul><br>text |
      `

            assertConverting(markdown, `${markdown}\n`)
        })

        it('table with list', () => {
            const markdown = source`
        | thead |
        | ----- |
        | <ul><li>bullet</li></ul> |
        | <ol><li>ordered</li></ol> |
        | <ul><li>nested<ul><li>nested</li></ul></li></ul> |
        | <ul><li>nested<ul><li>nested</li><li>nested</li></ul></li></ul> |
        | <ol><li>mix**ed**<ul><li>**mix**ed</li></ul></li></ol> |
        | <ol><li>mix*e*d<ul><li>*mix*ed</li></ul></li></ol> |
        | <ol><li>mix<em>ed</em><ul><li><strong>mix</strong>ed</li></ul></li></ol> |
        | foo<ul><li>bar</li></ul>baz |
        | ![altText](imgUrl) **mixed**<ul><li>[linkText](linkUrl) mixed</li></ul> |
      `

            const expected = source`
        | thead |
        | ----- |
        | <ul><li>bullet</li></ul> |
        | <ol><li>ordered</li></ol> |
        | <ul><li>nested<ul><li>nested</li></ul></li></ul> |
        | <ul><li>nested<ul><li>nested</li><li>nested</li></ul></li></ul> |
        | <ol><li>mix**ed**<ul><li>**mix**ed</li></ul></li></ol> |
        | <ol><li>mix*e*d<ul><li>*mix*ed</li></ul></li></ol> |
        | <ol><li>mix<em>ed</em><ul><li><strong>mix</strong>ed</li></ul></li></ol> |
        | foo<ul><li>bar</li></ul>baz |
        | ![altText](imgUrl) **mixed**<ul><li>[linkText](linkUrl) mixed</li></ul> |
      `

            assertConverting(markdown, `${expected}\n`)
        })

        it('table with unmatched html list', () => {
            const markdown = source`
        | thead |
        | ----- |
        | <ul><li>bullet</li><ul> |
        | <ol><li>ordered</li><ol> |
        | <ul><li>nested<ul><li>nested</li><ul><li><ul> |
      `
            const expected = source`
        | thead |
        | ----- |
        | <ul><li>bullet</li></ul> |
        | <ol><li>ordered</li></ol> |
        | <ul><li>nested<ul><li>nested</li></ul></li></ul> |
      `

            assertConverting(markdown, `${expected}\n`)
        })

        it('ordered list with start number in table', () => {
            const markdown = source`
        | thead |
        | ----- |
        | <ol start="3"><li>foo</li></ol> |
      `

            assertConverting(markdown, `${markdown}\n`)
        })

        it('pre tags as text', () => {
            assertConverting('foo <pre>bar</pre> baz', 'foo bar baz')
            assertConverting(
                '| thead |\n| --- |\n| <pre></pre> |\n| <pre>foo</pre> |',
                '| thead |\n| ----- |\n|  |\n| foo |\n'
            )
        })

        it('processing instructions, declarations and CDATA sections as text', () => {
            const markdown = source`
        foo <?php echo 1; ?> bar

        foo <!DOCTYPE html> bar

        foo <![CDATA[ x ]]> bar
      `

            assertConverting(markdown, markdown)
        })
    })

    describe('convert block html', () => {
        it('processing instructions, declarations, CDATA sections and unfinished tags as text', () => {
            assertConverting(
                '<?xml version="1.0" encoding="UTF-8"?>',
                '<?xml version="1.0" encoding="UTF-8"?>'
            )
            assertConverting('<!DOCTYPE html>', '<!DOCTYPE html>')
            assertConverting('<![CDATA[\nx\n]]>', '<![CDATA[\nx\n]]>')
            assertConverting('<p', '<p')
        })

        it('paragraph converts to markdown, division keeps its source', () => {
            const markdown = source`
        <p>paragraph</p>

        <div>division</div>
      `
            const expected = source`
        paragraph

        <div>division</div>
      `

            assertConverting(markdown, expected)
        })

        it('heading', () => {
            const markdown = source`
        <h1>heading1</h1>
        <h2>heading2</h2>
        <h3>heading3</h3>
        <h4>heading4</h4>
        <h5>heading4</h5>
        <h6>heading4</h6>
      `
            const expected = oneLineTrim`
        <h1>heading1</h1>
        <h2>heading2</h2>
        <h3>heading3</h3>
        <h4>heading4</h4>
        <h5>heading4</h5>
        <h6>heading4</h6>
      `

            assertConverting(markdown, expected)
        })

        it('pre', () => {
            const markdown = source`
        <pre>code</pre>
      `

            assertConverting(markdown, markdown)
        })

        it('blockquote', () => {
            const markdown = source`
        <blockquote>foo</blockquote>
        <blockquote>foo<blockquote>foo</blockquote></blockquote>
      `
            const expected = oneLineTrim`
        <blockquote>foo</blockquote>
        <blockquote>foo<blockquote>foo</blockquote></blockquote>
      `

            assertConverting(markdown, expected)
        })

        it('bullet list', () => {
            const markdown = source`
        <ul><li>foo</li></ul>
        <ul><li>foo<ul><li>foo</li></ul></li></ul>
      `
            const expected = oneLineTrim`
        <ul><li>foo</li></ul>
        <ul><li>foo<ul><li>foo</li></ul></li></ul>
      `

            assertConverting(markdown, expected)
        })

        it('ordered list', () => {
            const markdown = source`
        <ol><li>foo</li></ol>
        <ol><li>foo<ol><li>foo</li></ol></li></ol>
      `
            const expected = oneLineTrim`
        <ol><li>foo</li></ol>
        <ol><li>foo<ol><li>foo</li></ol></li></ol>
      `

            assertConverting(markdown, expected)
        })

        it('task', () => {
            const markdown = source`
        <ul><li class="task-list-item" data-task>bullet task</li></ul>
        <ul><li class="task-list-item checked" data-task data-task-checked>ordered task</li></ul>
      `
            const expected = oneLineTrim`
        <ul><li class="task-list-item" data-task>bullet task</li></ul>
        <ul><li class="task-list-item checked" data-task data-task-checked>ordered task</li></ul>
      `

            assertConverting(markdown, expected)
        })

        it('table', () => {
            const markdown = source`
        <table><thead><tr><th>foo</th></tr></thead><tbody><tr><td>bar</td></tr></tbody></table>
      `

            assertConverting(markdown, markdown)
        })

        it('ordered list with start number', () => {
            const markdown = '<ol start="3"><li>foo</li></ol>'

            assertConverting(markdown, markdown)
        })

        it('table with an empty tbody', () => {
            const mdNode = parser.parse(
                '<table><thead><tr><th>foo</th></tr></thead><tbody></tbody></table>'
            )
            const wwNode = convertor.toWysiwygModel(mdNode)!

            expect(wwNode.firstChild!.type.name).toBe('table')
            expect(wwNode.textContent).toBe('foo')
        })

        it('with html inline', () => {
            const markdown = source`
        <h1><b>foo</b></h1>
        <ul><li>foo <i>bar</i></li></ul>
        <blockquote><s>foo</s> bar</blockquote>
      `
            const expected = oneLineTrim`
        <h1><b>foo</b></h1>
        <ul><li>foo <i>bar</i></li></ul>
        <blockquote><s>foo</s> bar</blockquote>
      `

            assertConverting(markdown, expected)
        })
    })

    describe('convert custom inline', () => {
        it('with info only', () => {
            const markdown = source`$$custom$$`
            const expected = oneLineTrim`$$custom$$`

            assertConverting(markdown, expected)
        })

        it('with info and text', () => {
            const markdown = source`$$custom inline$$`
            const expected = oneLineTrim`$$custom inline$$`

            assertConverting(markdown, expected)
        })
    })

    describe('sanitize when using html', () => {
        it('href attribute with link', () => {
            const markdown = source`
        <a href="javascript:alert();">xss</a>

        <a href="  JaVaScRiPt: alert();">xss</a>

        <a href="vbscript:alert();">xss</a>

        <a href="  VBscript: alert(); ">xss</a>

        <a href="livescript:alert();">xss</a>

        <a href="  LIVEScript: alert() ;">xss</a>

        123<a href=' javascript:alert();'>xss</a>
      `
            // the markdown keeps its source; WYSIWYG shows it as text, never as a live element
            const wwNode = convertor.toWysiwygModel(parser.parse(markdown))!
            const dom = document.createElement('div')

            dom.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(wwNode.content))

            expect(dom.querySelector('a[href]')).toBeNull()
            assertConverting(markdown, markdown)
        })

        it('src attribute with image', () => {
            const markdown = source`
        <img src="javascript:alert();">

        <img src="  JaVaScRiPt: alert();">

        <img src="vbscript:alert();">

        <img src="  VBscript: alert(); ">

        <img src="  LIVEScript: alert() ;">
      `
            // the markdown keeps its source; WYSIWYG shows it as text, never as a live element
            const wwNode = convertor.toWysiwygModel(parser.parse(markdown))!
            const dom = document.createElement('div')

            dom.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(wwNode.content))

            expect(dom.querySelector('img[src]')).toBeNull()
            assertConverting(markdown, markdown)
        })
    })

    describe('should custom convertor when converting from wysiwyg to markdown', () => {
        function createCustomConvertor(customConvertor: ToMdConvertorMap) {
            schema = createSchema()
            convertor = new Convertor(schema, customConvertor, {}, new EventEmitter())
        }

        it('should change delimeter', () => {
            const toMdCustomConvertor = {
                thematicBreak: () => ({
                    delim: '- - -'
                })
            }

            createCustomConvertor(toMdCustomConvertor)

            assertConverting('***', '- - -')
        })

        it('should change raw html', () => {
            const toMdCustomConvertor = {
                thematicBreak: () => ({
                    rawHTML: '<hr class="foo">'
                })
            }

            createCustomConvertor(toMdCustomConvertor)

            assertConverting('***', '<hr class="foo">')
        })

        it('should not convert raw html when returning only delimiter', () => {
            const toMdCustomConvertor = {
                thematicBreak: () => ({
                    delim: '***'
                })
            }

            createCustomConvertor(toMdCustomConvertor)

            assertConverting('<hr>', '***')
        })

        it('should convert to original value', () => {
            const toMdCustomConvertor = {
                thematicBreak: (_: NodeInfo | MarkInfo, { origin }: ToMdConvertorContext) => origin!()
            }

            createCustomConvertor(toMdCustomConvertor)

            assertConverting('***', '***')
        })

        it('should convert by mixing return values', () => {
            const toMdCustomConvertor = {
                heading: ({ node }: NodeInfo | MarkInfo, { origin }: ToMdConvertorContext) => {
                    const { level, headingType } = node.attrs

                    if (headingType === 'setext') {
                        const delim = level === 1 ? '========' : '------'

                        return { delim }
                    }

                    return origin!()
                }
            }

            createCustomConvertor(toMdCustomConvertor)

            const markdown = source`
        heading1
        ===

        heading2
        ---

        # heading1
      `
            const expected = source`
        heading1
        ========

        heading2
        ------

        # heading1
      `

            assertConverting(markdown, expected)
        })
    })

    describe('with front matter parser option', () => {
        function assertFrontMatterConverting(markdown: string, expected: string) {
            const useFrontMatterParser = new Parser({
                disallowedHtmlBlockTags: ['br', 'img'],
                frontMatter: true
            })
            const mdNode = useFrontMatterParser.parse(markdown)

            const wwNode = convertor.toWysiwygModel(mdNode)
            const result = convertor.toMarkdownText(wwNode!)

            expect(result).toBe(expected)
        }

        it('should convert front matter', () => {
            const markdown = source`
        ---
        title: foo
        desc: bar
        ---
      `

            assertFrontMatterConverting(markdown, markdown)
        })
    })

    describe('should convert html block node which is not supported as default', () => {
        function createConvertorWithHTMLRenderer() {
            const customHTMLRenderer = createHTMLrenderer()
            const adaptor = new WwToDOMAdaptor({}, customHTMLRenderer)
            const htmlSchemaMap = createHTMLSchemaMap(customHTMLRenderer, sanitizeHTML, adaptor)
            const specs = createSpecs({})

            schema = new Schema({
                nodes: { ...specs.nodes, ...htmlSchemaMap.nodes },
                marks: { ...specs.marks, ...htmlSchemaMap.marks }
            })
            convertor = new Convertor(schema, {}, {}, new EventEmitter())
        }

        beforeEach(() => {
            createConvertorWithHTMLRenderer()
        })

        it('should convert html block node to wysiwyg ignoring sanitizer tag', () => {
            const markdown =
                '<iframe src="https://www.youtube.com/embed/XyenY12fzAk" height="315" width="420"></iframe>'
            const expected =
                '<iframe src="https://www.youtube.com/embed/XyenY12fzAk" height="315" width="420"></iframe>'

            assertConverting(markdown, expected)
        })

        it('should convert html block element which has "=" character as the attribute value', () => {
            const markdown =
                '<iframe src="//player.bilibili.com/player.html?aid=588782532&bvid=BV1hB4y1K7ro&cid=360826679&page=1" height="315" width="420"></iframe>'
            const expected =
                '<iframe src="//player.bilibili.com/player.html?aid=588782532&amp;bvid=BV1hB4y1K7ro&amp;cid=360826679&amp;page=1" height="315" width="420"></iframe>'

            assertConverting(markdown, expected)
        })

        it('should convert html block node as the block node through inserting the blank line', () => {
            const markdown = source`
        para1

        <iframe src="https://www.youtube.com/embed/XyenY12fzAk" width="420" height="315"></iframe>

        para2
      `
            const expected = source`
        para1

        <iframe src="https://www.youtube.com/embed/XyenY12fzAk" width="420" height="315"></iframe>

        para2
      `

            assertConverting(markdown, expected)
        })

        it('should convert html inline node', () => {
            const markdown = 'inline <big class="my-big">content</big>'

            assertConverting(markdown, markdown)
        })
    })

    describe('with custom convertor when converting from markdown to wysiwyg', () => {
        function createCustomConvertor(customConvertor: HTMLConvertorMap) {
            schema = createSchema()
            convertor = new Convertor(schema, {}, customConvertor, new EventEmitter())
        }

        it('should convert markdown to wysiwyg', () => {
            const toHTMLConvertor: HTMLConvertorMap = {
                paragraph: (_: MdNode, { entering, origin, options }: Context) => {
                    if (options.nodeId) {
                        return {
                            type: entering ? 'openTag' : 'closeTag',
                            outerNewLine: true,
                            tagName: 'p'
                        }
                    }

                    return origin!()
                }
            }

            createCustomConvertor(toHTMLConvertor)

            const markdown = source`
        > * Wrappers
        >     1. [x] React
        >     2. [x] Vue
        >     3. [ ] Ember
      `

            assertConverting(markdown, markdown)
        })
    })

    describe('should escape markdown text in wysiwyg', () => {
        it('with markdown text', () => {
            const markdown = source`
        \\# heading
        \\> blockquote
        \\*test\\*
        \\* list
      `

            assertConverting(markdown, markdown)
        })

        it('with list markers', () => {
            const markdown = source`
        \\+ list

        3\\) list

        1\\.
      `

            assertConverting(markdown, markdown)
        })

        it('with text that would become a setext heading underline', () => {
            const wwNode = Node.fromJSON(schema, {
                type: 'doc',
                content: ['foo', '===', 'bar', '-'].map((text) => ({
                    type: 'paragraph',
                    content: [{ type: 'text', text }]
                }))
            })

            expect(convertor.toMarkdownText(wwNode)).toBe('foo\n\\=\\=\\=\nbar\n\\-')
        })

        it('with html text', () => {
            const markdown = source`
        \\<div>block\\</div>
        \\<strong>bold\\</strong>
      `

            assertConverting(markdown, markdown)
        })
    })

    describe('emphasis that starts/ends with punctuation', () => {
        it('should convert by using HTML tag when not preceded by whitespace or punctuation', () => {
            const wwNodeJson = {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            { type: 'text', text: 'a' },
                            {
                                type: 'text',
                                marks: [{ type: 'emph' }],
                                text: '"test"'
                            }
                        ]
                    }
                ]
            }
            const wwNode = Node.fromJSON(schema, wwNodeJson)

            const result = convertor.toMarkdownText(wwNode)

            expect(result).toBe('a<em>"test"</em>')
        })

        it('should convert by using HTML tag when not succeeded by whitespace or punctuation', () => {
            const wwNodeJson = {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                marks: [{ type: 'strong' }],
                                text: '"test"'
                            },
                            { type: 'text', text: 'a' }
                        ]
                    }
                ]
            }
            const wwNode = Node.fromJSON(schema, wwNodeJson)

            const result = convertor.toMarkdownText(wwNode)

            expect(result).toBe('<strong>"test"</strong>a')
        })

        it('should not convert by using HTML tag when preceded by whitespace', () => {
            const markdown = 'test **"test"**'
            const expected = 'test **"test"**'

            assertConverting(markdown, expected)
        })

        it('should not convert by using HTML tag when preceded by punctuation', () => {
            const markdown = 'test,**"test"**'
            const expected = 'test,**"test"**'

            assertConverting(markdown, expected)
        })

        it('should use matching opening and closing tags when the emphasis spans several text nodes', () => {
            const wwNodeJson = {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            { type: 'text', text: 'a' },
                            { type: 'text', marks: [{ type: 'strong' }], text: '"te' },
                            { type: 'text', marks: [{ type: 'strong' }, { type: 'emph' }], text: 'st' },
                            { type: 'text', text: ' b' }
                        ]
                    }
                ]
            }
            const wwNode = Node.fromJSON(schema, wwNodeJson)

            const result = convertor.toMarkdownText(wwNode)

            expect(result).toBe('a<strong>"te*st*</strong> b')
        })

        it('should not convert by using HTML tag when inside another emphasis', () => {
            const markdown = '**test*test***'
            const expected = '**test*test***'

            assertConverting(markdown, expected)
        })
    })

    it('should write a hard break in a table cell as <br> and leave out a trailing one', () => {
        const text = (value: string) => ({ type: 'text', text: value })
        const cell = (type: string, content: any[]) => ({
            type,
            content: [{ type: 'paragraph', content }]
        })
        const wwNode = Node.fromJSON(schema, {
            type: 'doc',
            content: [
                {
                    type: 'table',
                    content: [
                        {
                            type: 'tableHead',
                            content: [{ type: 'tableRow', content: [cell('tableHeadCell', [text('head')])] }]
                        },
                        {
                            type: 'tableBody',
                            content: [
                                {
                                    type: 'tableRow',
                                    content: [cell('tableBodyCell', [text('foo'), { type: 'hardBreak' }, text('bar')])]
                                }
                            ]
                        }
                    ]
                },
                { type: 'paragraph', content: [text('baz'), { type: 'hardBreak' }] }
            ]
        })

        expect(convertor.toMarkdownText(wwNode)).toBe('| head |\n| ---- |\n| foo<br>bar |\n\nbaz')
    })

    it('should leave out an empty line at the end of a list item', () => {
        const wwNodeJson = {
            type: 'doc',
            content: [
                {
                    type: 'bulletList',
                    content: [
                        {
                            type: 'listItem',
                            content: [
                                { type: 'paragraph', content: [{ type: 'text', text: 'test_1' }] },
                                { type: 'paragraph', content: [] }
                            ]
                        },
                        {
                            type: 'listItem',
                            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'test_2' }] }]
                        }
                    ]
                }
            ]
        }

        const wwNode = Node.fromJSON(schema, wwNodeJson)

        const result = convertor.toMarkdownText(wwNode)

        expect(result).toBe('* test\\_1\n* test\\_2')
    })

    it('should escape the backslash, which is a plain chracter in the middle of a sentence', () => {
        const markdown = source`
      backslash \\in the middle of a sentence
      `
        const expected = source`
      backslash \\\\in the middle of a sentence
      `

        assertConverting(markdown, expected)
    })
})
