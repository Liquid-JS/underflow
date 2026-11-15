import { BaseNode } from './node'

// Smart punctuation keeps the text as written in `literal`, and its typographic form in `smartLiteral`. Quotes are
// resolved as the text is parsed, one character for one, so while text nodes are merged and split into autolinks,
// `smartLiteral` lines up with `literal`; dashes and ellipses, which change the length, come last.

const reEllipses = /\.\.\./g
const reDash = /--+/g

/** The characters of a text node, by index in its literal, that stay as written: escaped, or from an entity. */
const verbatim = new WeakMap<BaseNode, number[]>()

/** Keeps the text of a node as written, e.g. an escaped `\-`, whose hyphen doesn't make a dash. */
export function markVerbatim(node: BaseNode) {
    verbatim.set(node, [...Array(node.literal!.length).keys()])
}

/** Gives a node the smart text of the text nodes merged into it, before its literal is changed. */
export function mergeSmart(merged: BaseNode, nodes: BaseNode[]) {
    const indexes: number[] = []
    let offset = 0
    for (const node of nodes) {
        indexes.push(...(verbatim.get(node) ?? []).map((index) => index + offset))
        offset += node.literal!.length
    }
    if (nodes.some(({ smartLiteral }) => smartLiteral !== null)) {
        merged.smartLiteral = nodes.map((node) => node.smartLiteral ?? node.literal).join('')
    }
    if (indexes.length) {
        verbatim.set(merged, indexes)
    }
}

/** Gives a node made of a part of another's text, e.g. beside an autolink, the smart text of that part. */
export function sliceSmart(node: BaseNode, part: BaseNode, start: number, end = node.literal!.length) {
    if (node.smartLiteral !== null) {
        part.smartLiteral = node.smartLiteral.slice(start, end)
    }
    const indexes = (verbatim.get(node) ?? []).filter((index) => index >= start && index < end)
    if (indexes.length) {
        verbatim.set(
            part,
            indexes.map((index) => index - start)
        )
    }
}

/** A run of hyphens as dashes: `--` an en dash, `---` an em dash, and longer runs a mix of them. */
function smartDashes(chars: string) {
    let enCount = 0
    let emCount = 0
    if (chars.length % 3 === 0) {
        // If divisible by 3, use all em dashes
        emCount = chars.length / 3
    } else if (chars.length % 2 === 0) {
        // If divisible by 2, use all en dashes
        enCount = chars.length / 2
    } else if (chars.length % 3 === 2) {
        // If 2 extra dashes, use en dash for last 2; em dashes for rest
        enCount = 1
        emCount = (chars.length - 2) / 3
    } else {
        // Use en dashes for last 4 hyphens; em dashes for rest
        enCount = 2
        emCount = (chars.length - 4) / 3
    }
    return '—'.repeat(emCount) + '–'.repeat(enCount)
}

function dashesAndEllipses(text: string) {
    return text.replace(reEllipses, '…').replace(reDash, smartDashes)
}

/** Completes a text node's smart text with dashes and ellipses, between the characters that stay as written. */
export function completeSmart(node: BaseNode) {
    const text = node.smartLiteral ?? node.literal!
    const kept = new Set(verbatim.get(node))
    let smart = ''
    let run = ''
    for (let index = 0; index < text.length; index += 1) {
        if (kept.has(index)) {
            smart += dashesAndEllipses(run) + text[index]
            run = ''
        } else {
            run += text[index]
        }
    }
    smart += dashesAndEllipses(run)
    node.smartLiteral = smart === node.literal ? null : smart
}
