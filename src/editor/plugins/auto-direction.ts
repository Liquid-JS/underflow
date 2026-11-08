import { Node as ProsemirrorNode } from 'prosemirror-model'
import { Plugin } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

/**
 * The blocks that take the direction of their own text, as on GitHub, so a paragraph in another direction than the
 * page's reads the right way, and its list's bullets or its quote's line are on its side. Only the outer blocks do,
 * with all of their text, as the browser leaves out the text of blocks inside that have a direction of their own:
 * a list takes the direction of its first item, and a table of its first cell. Code reads left to right.
 */
const AUTO_DIRECTION_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'BLOCKQUOTE', 'TABLE'])

/** Gives the blocks of rendered markdown the direction of their own text, unless they have one. */
export function setAutoDirection(root: Element) {
    for (const el of Array.from(root.children)) {
        if (AUTO_DIRECTION_TAGS.has(el.nodeName) && !el.hasAttribute('dir')) {
            el.setAttribute('dir', 'auto')
        }
    }
}

const WYSIWYG_BLOCKS = new Set(['paragraph', 'heading', 'bulletList', 'orderedList', 'blockQuote', 'table'])

/** The WYSIWYG editor's blocks, as the rendered markdown's. */
export const isWysiwygAutoDirectionBlock = (node: ProsemirrorNode) => WYSIWYG_BLOCKS.has(node.type.name)

/** The markdown editor's lines, but not those of code and custom blocks. */
export const isMarkdownAutoDirectionLine = (node: ProsemirrorNode) =>
    node.isTextblock && !/^(code|custom)-block/.test(node.attrs.className ?? '')

/**
 * Gives the document's blocks that `applies` to the direction of their own text, with decorations, which aren't part
 * of the document, so its HTML doesn't change.
 */
export function autoDirection(applies: (node: ProsemirrorNode) => boolean) {
    const decorate = (doc: ProsemirrorNode) => {
        const decorations: Decoration[] = []

        doc.forEach((node, pos) => {
            if (applies(node)) {
                decorations.push(Decoration.node(pos, pos + node.nodeSize, { dir: 'auto' }))
            }
        })

        return DecorationSet.create(doc, decorations)
    }

    return new Plugin<DecorationSet>({
        state: {
            init: (_, { doc }) => decorate(doc),
            apply: (tr, decorations) => (tr.docChanged ? decorate(tr.doc) : decorations)
        },
        props: {
            decorations(state) {
                return this.getState(state)
            }
        }
    })
}
