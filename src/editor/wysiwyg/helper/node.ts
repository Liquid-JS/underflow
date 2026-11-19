import { Node as ProsemirrorNode, ResolvedPos } from 'prosemirror-model'

type NodeAttrs = Record<string, any>

interface CustomAttrs {
    htmlAttrs: { default: any }
    classNames: { default: null | string[] }
}

export function findNodeBy(
    pos: ResolvedPos,
    condition: (node: ProsemirrorNode, depth: number) => boolean
) {
    let { depth } = pos

    while (depth) {
        const node = pos.node(depth)

        if (condition(node, depth)) {
            return {
                node,
                depth,
                offset: depth > 0 ? pos.before(depth) : 0
            }
        }

        depth -= 1
    }

    return null
}

export function isListNode({ type }: ProsemirrorNode) {
    return type.name === 'bulletList' || type.name === 'orderedList'
}

export function isInListNode(pos: ResolvedPos) {
    return !!findNodeBy(
        pos,
        ({ type }: ProsemirrorNode) =>
            type.name === 'listItem' || type.name === 'bulletList' || type.name === 'orderedList'
    )
}

export function isInTableNode(pos: ResolvedPos) {
    return !!findNodeBy(
        pos,
        ({ type }: ProsemirrorNode) => type.name === 'tableHeadCell' || type.name === 'tableBodyCell'
    )
}

export function findListItem(pos: ResolvedPos) {
    return findNodeBy(pos, ({ type }: ProsemirrorNode) => type.name === 'listItem')
}

/**
 * The tag an element was written with as HTML in the markdown, from its `data-raw-html`; a value that isn't the
 * element's own tag, e.g. in pasted HTML, is dropped, so it becomes neither another element nor raw HTML in the markdown
 */
export function getRawHTML(dom: Node | string) {
    const el = dom as HTMLElement
    const rawHTML = el.getAttribute('data-raw-html')

    return rawHTML?.toLowerCase() === el.localName ? el.localName : null
}

/** The tag to draw a node or mark with: the tag it was written with if it's one of `tags`, otherwise `fallback` */
export function getRawHTMLTag(rawHTML: unknown, tags: string[], fallback: string) {
    const tag = typeof rawHTML === 'string' ? rawHTML.toLowerCase() : null

    return tag && tags.includes(tag) ? tag : fallback
}

export function createDOMInfoParsedRawHTML(tag: string) {
    return {
        tag,
        getAttrs: (dom: Node | string) => {
            const rawHTML = getRawHTML(dom)

            return {
                ...(rawHTML && { rawHTML })
            }
        }
    }
}

export function createCellAttrs(attrs: NodeAttrs) {
    return Object.keys(attrs).reduce<NodeAttrs>((acc, attrName) => {
        if (attrName !== 'rawHTML' && attrs[attrName]) {
            attrName = attrName === 'className' ? 'class' : attrName
            acc[attrName] = attrs[attrName]
        }
        return acc
    }, {})
}

export function createParsedCellDOM(tag: string) {
    return {
        tag,
        getAttrs: (dom: Node | string): NodeAttrs => {
            const rawHTML = getRawHTML(dom)

            return rawHTML ? { rawHTML } : {}
        }
    }
}

export function getDefaultCustomAttrs(): CustomAttrs {
    return {
        htmlAttrs: { default: null },
        classNames: { default: null }
    }
}

export function getCustomAttrs(attrs: Record<string, any>) {
    const { htmlAttrs, classNames } = attrs

    return { ...htmlAttrs, class: classNames ? classNames.join(' ') : null }
}
