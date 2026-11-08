import {
    Editor,
    EditorCore,
    type CustomHTMLRenderer,
    type EditorOptions,
    type EditorPlugin,
    type MdNode,
    type PluginContext,
    type PluginInfo,
    type ViewerOptions
} from '@liquid-js/underflow'
import './styles.scss'
import { deDE } from '@liquid-js/underflow/i18n/de-de'
import { codeSyntaxHighlightPlugin, type PluginOptions } from '@liquid-js/underflow/plugins/code-syntax-highlight'
import {
    MarkdownDocument,
    Parser,
    Renderer,
    type HeadingMdNode,
    type HTMLConvertorMap,
    type MdPos
} from '@liquid-js/underflow/parser'
import { Viewer } from '@liquid-js/underflow/viewer'
import { renderMarkdown } from '@liquid-js/underflow/render'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'

hljs.registerLanguage('javascript', javascript)
Editor.setLanguage(['de', 'de-DE'], deDE)

/** A small plugin: marks bold text with a class and counts the editor's change events. */
function smokePlugin(context: PluginContext, options: { className: string }): PluginInfo {
    let changes = 0

    context.eventEmitter.listen('change', () => {
        changes += 1
    })
    context.eventEmitter.addEventType('smokeChanges')
    context.eventEmitter.listen('smokeChanges', () => changes)

    return {
        toHTMLRenderers: {
            strong: (_node: MdNode, { entering }) => entering
                ? { type: 'openTag', tagName: 'strong', classNames: [options.className] }
                : { type: 'closeTag', tagName: 'strong' }
        }
    }
}

const highlightOptions: PluginOptions = { highlighter: hljs, lineNumbers: true }
const plugins: EditorPlugin[] = [
    [codeSyntaxHighlightPlugin, highlightOptions],
    [smokePlugin, { className: 'smoke-strong' }]
]

/** Renders headings with an id taken from their level. */
const customHTMLRenderer: CustomHTMLRenderer = {
    heading: (node, { entering }) => {
        const { level } = node as HeadingMdNode

        return entering
            ? { type: 'openTag', tagName: `h${level}`, attributes: { id: `heading-${level}` } }
            : { type: 'closeTag', tagName: `h${level}` }
    },
    // HTML block renderers are a map by tag name
    htmlBlock: {
        iframe: (node) => [
            { type: 'openTag', tagName: 'iframe', outerNewLine: true, attributes: node.attrs },
            { type: 'html', content: node.childrenHTML ?? '' },
            { type: 'closeTag', tagName: 'iframe', outerNewLine: true }
        ]
    }
}

// ?wrap shows the toolbar that wraps onto more rows, ?readonly a read-only editor, ?disabled a disabled one,
// ?rtl right-to-left text, ?autodir blocks in the direction of their text
const params = new URLSearchParams(location.search)

if (params.has('rtl')) {
    document.documentElement.dir = 'rtl'
}

const editorOptions: EditorOptions = {
    el: document.querySelector<HTMLElement>('#editor')!,
    initialValue: '# Hallo\n\n```javascript\nconst a = 1;\nconst b = 2;\n```',
    initialEditType: 'wysiwyg',
    toolbarStyle: params.has('wrap') ? 'wrap' : 'default',
    readonly: params.has('readonly'),
    disabled: params.has('disabled'),
    autoDirection: params.has('autodir'),
    language: 'de-DE',
    plugins,
    customHTMLRenderer
}
const editor = new Editor(editorOptions)

const viewerOptions: ViewerOptions = {
    el: document.querySelector<HTMLElement>('#viewer')!,
    initialValue: '*viewer* and **bold**',
    plugins: [[smokePlugin, { className: 'smoke-strong' }]]
}
const viewer = new Viewer(viewerOptions)

// the parser on its own: parse a document, find a node, render it with custom convertors
const doc = new MarkdownDocument('# Title\n\nSome *text*')
const pos: MdPos = [3, 7]
const convertors: HTMLConvertorMap = {
    emph: (_node, { entering }) => ({ type: entering ? 'openTag' : 'closeTag', tagName: 'i' })
}

Object.assign(window, {
    // for the tests to set the text
    smokeEditor: editor,
    smoke: {
        markdown: editor.getMarkdown(),
        isEditorCore: editor instanceof EditorCore,
        isViewer: viewer.isViewer(),
        parsed: new Parser().parse('**parser**').firstChild?.type,
        nodeAtPos: doc.findNodeAtPosition(pos)?.type,
        rendered: new Renderer({ convertors }).render(doc.getRootNode()),
        previewHTML: editor.getHTML(),
        // markdown rendered as the viewer does, with a plugin
        renderedMarkdown: renderMarkdown('**render**', { plugins: [[smokePlugin, { className: 'smoke-strong' }]] })
    }
})
