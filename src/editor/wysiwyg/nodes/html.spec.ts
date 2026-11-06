import { DOMSerializer } from 'prosemirror-model'
import { ToDOMAdaptor } from '../../types/convertor'
import { WwToDOMAdaptor } from '../adaptor/ww-to-dom-adaptor'
import { EventEmitter } from '../../event/event-emitter'
import { WysiwygEditor } from '../ww-editor'
import { sanitizeHTML } from '../../sanitizer/html-sanitizer'
import { createHTMLSchemaMap } from './html'
import { HTMLConvertorMap } from '@liquid-js/underflow/parser'

let wwe: WysiwygEditor; let em: EventEmitter; let toDOMAdaptor: ToDOMAdaptor

beforeEach(() => {
    const convertors: HTMLConvertorMap = {
        htmlBlock: {
            // @ts-expect-error nested html convertor maps are not modelled by HTMLConvertorMap
            div: (node) => [
                { type: 'openTag', tagName: 'div', outerNewLine: true, attributes: node.attrs },
                { type: 'html', content: node.childrenHTML },
                { type: 'closeTag', tagName: 'div', outerNewLine: true }
            ]
        },
        htmlInline: {
            // @ts-expect-error nested html convertor maps are not modelled by HTMLConvertorMap
            span: (node, { entering }) => entering
                ? { type: 'openTag', tagName: 'span', attributes: node.attrs }
                : { type: 'closeTag', tagName: 'span' }
        }
    }

    toDOMAdaptor = new WwToDOMAdaptor({}, convertors)
    em = new EventEmitter()

    const htmlSchemaMap = createHTMLSchemaMap(convertors, sanitizeHTML, toDOMAdaptor)

    wwe = new WysiwygEditor(em, { toDOMAdaptor, htmlSchemaMap })
})

afterEach(() => {
    wwe.destroy()
})

function getHtmlBlockSpec(htmlAttrs: Record<string, string>, childrenHTML: string) {
    const { div } = wwe.schema.nodes

    return div.spec.toDOM!(div.create({ htmlAttrs, childrenHTML }))
}

// The entries of a `DOMOutputSpec` array that `DOMSerializer.renderSpec` refuses to render.
// It only accepts element nodes (`nodeType === 1`) and strings, so a text or comment node
// handed to it as an array entry throws `RangeError: Invalid array passed to renderSpec`.
function getUnrenderableSpecEntries(spec: unknown) {
    if (!Array.isArray(spec)) {
        return []
    }

    return spec
        .slice(2)
        .filter(
            (entry) => entry && typeof entry === 'object' && 'nodeType' in entry && entry.nodeType !== 1
        )
}

describe('htmlBlock schema', () => {
    it('should return the sanitized element itself, not a spec array of raw child nodes', () => {
        const spec = getHtmlBlockSpec({}, '<a href="#">1</a> <a href="#">2</a>')

        expect(Array.isArray(spec)).toBe(false)
        expect((spec as HTMLElement).nodeType).toBe(1)
    })

    it('should not hand non-element child nodes to renderSpec when children contain text nodes', () => {
    // `<div class="links"><a href="#">1</a> <a href="#">2</a></div>` is the shape authors write
    // for pagination blocks; the whitespace between the anchors is a text child node.
        const spec = getHtmlBlockSpec({ class: 'links' }, '<a href="#">1</a> <a href="#">2</a>')

        expect(getUnrenderableSpecEntries(spec)).toEqual([])
    })

    it('should not hand non-element child nodes to renderSpec when children are plain text', () => {
        const spec = getHtmlBlockSpec({}, 'plain text')

        expect(getUnrenderableSpecEntries(spec)).toEqual([])
    })

    it('should preserve text nodes between element children', () => {
        const spec = getHtmlBlockSpec({}, '<a href="#">1</a> <a href="#">2</a>')

        expect((spec as HTMLElement).outerHTML).toBe(
            '<div class="html-block"><a href="#">1</a> <a href="#">2</a></div>'
        )
    })

    it('should append the html-block class to the existing classes', () => {
        const spec = getHtmlBlockSpec({ class: 'links' }, 'text')

        expect((spec as HTMLElement).outerHTML).toBe('<div class="links html-block">text</div>')
    })

    it('should keep the other html attributes', () => {
        const spec = getHtmlBlockSpec({ 'data-my-attr': 'my-attr' }, 'text')

        expect((spec as HTMLElement).outerHTML).toBe(
            '<div data-my-attr="my-attr" class="html-block">text</div>'
        )
    })

    it('should be re-renderable without accumulating the html-block class', () => {
    // ProseMirror re-creates the DOM for a node on decoration changes, so toDOM runs more than
    // once for the same node. The class must not pile up, and the second render must not throw.
        const { div } = wwe.schema.nodes
        const node = div.create({
            htmlAttrs: { class: 'links' },
            childrenHTML: '<a href="#">1</a> <a href="#">2</a>'
        })

        const first = div.spec.toDOM!(node) as HTMLElement
        const second = div.spec.toDOM!(node) as HTMLElement

        expect(first.outerHTML).toBe(second.outerHTML)
        expect(second.getAttribute('class')).toBe('links html-block')
        expect(node.attrs.htmlAttrs).toEqual({ class: 'links' })
        expect(first).not.toBe(second)
    })
    it('should be serialized by the DOMSerializer of the schema', () => {
        const { div } = wwe.schema.nodes
        const node = div.create({ htmlAttrs: {}, childrenHTML: '<a href="#">1</a> <a href="#">2</a>' })
        const dom = DOMSerializer.fromSchema(wwe.schema).serializeNode(node) as HTMLElement

        expect(dom.outerHTML).toBe('<div class="html-block"><a href="#">1</a> <a href="#">2</a></div>')
    })
})

describe('htmlInline schema', () => {
    it('should return a spec array with a content hole', () => {
        const { span } = wwe.schema.marks
        const spec = span.spec.toDOM!(span.create({ htmlAttrs: { class: 'my-span' } }), true)

        expect(spec).toEqual(['span', { class: 'my-span' }, 0])
    })
})
