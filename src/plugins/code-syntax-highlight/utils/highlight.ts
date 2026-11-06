import type { HLJSApi } from 'highlight.js'
import { escapeXml } from './common'

export interface HighlightedText {
    text: string
    classes: string[]
}

export interface LineNumberOptions {
    /** Number of the first line. */
    startFrom: number
    /** Number code blocks that have a single line as well. */
    singleLine: boolean
}

/** A node of the token tree highlight.js builds while highlighting (its internal `TokenTree`). */
interface TokenNode {
    scope?: string
    children: Array<TokenNode | string>
}

interface TokenTree {
    root: TokenNode
    classPrefix: string
}

const reLineBreak = /\r\n|\r|\n/

/** The language name highlight.js knows `language` by, if any (resolves aliases such as `js`). */
export function getLanguage(hljs: HLJSApi, language?: string | null) {
    return language && hljs.getLanguage(language) ? language : null
}

/**
 * The token tree of the highlighted code. It is read from the highlight result instead of
 * configuring a custom emitter, so the application's highlight.js instance stays untouched.
 */
function getTokenTree(hljs: HLJSApi, code: string, language: string): TokenTree | null {
    const result = hljs.highlight(code, { language, ignoreIllegals: true }) as unknown as {
        _emitter?: { rootNode?: TokenNode, options?: { classPrefix?: string } }
    }

    const emitter = result._emitter

    return emitter?.rootNode
        ? { root: emitter.rootNode, classPrefix: emitter.options?.classPrefix ?? 'hljs-' }
        : null
}

/** The CSS classes highlight.js uses for a scope (same rules as its HTML renderer). */
function scopeToClasses(scope: string, prefix: string) {
    if (scope.startsWith('language:')) {
        return [scope.replace('language:', 'language-')]
    }

    const [first, ...rest] = scope.split('.')

    return [`${prefix}${first}`, ...rest.map((piece, i) => `${piece}${'_'.repeat(i + 1)}`)]
}

function walk(
    node: TokenNode | string,
    classPrefix: string,
    classes: string[],
    visit: (text: string, classes: string[]) => void
) {
    if (typeof node === 'string') {
        visit(node, classes)
        return
    }

    const nodeClasses = node.scope
        ? [...classes, ...scopeToClasses(node.scope, classPrefix)]
        : classes

    node.children.forEach((child) => walk(child, classPrefix, nodeClasses, visit))
}

/**
 * Splits code into runs of text with the highlight.js classes that apply to them, for
 * WYSIWYG decorations. The text of the runs adds up to the code exactly.
 */
export function highlightToRanges(hljs: HLJSApi, code: string, language?: string | null) {
    const lang = getLanguage(hljs, language)
    const tree = lang ? getTokenTree(hljs, code, lang) : null
    const ranges: HighlightedText[] = []

    if (tree) {
        walk(tree.root, tree.classPrefix, [], (text, classes) => {
            if (text) {
                ranges.push({ text, classes })
            }
        })
    }

    return ranges
}

/**
 * Highlighted HTML split into lines. Spans that cross a line break are closed before it and
 * reopened after it, so every line is valid HTML on its own.
 * Adapted from the line-aware renderer in nxt-highlightjs (Liquid-JS).
 */
function highlightToLines(hljs: HLJSApi, code: string, language: string | null) {
    const tree = language ? getTokenTree(hljs, code, language) : null

    if (!tree) {
        return code.split(reLineBreak).map(escapeXml)
    }

    const lines = ['']

    walk(tree.root, tree.classPrefix, [], (text, classes) => {
        const open = classes.map((name) => `<span class="${name}">`).join('')
        const close = '</span>'.repeat(classes.length)

        text.split(reLineBreak).forEach((part, index) => {
            if (index > 0) {
                lines.push('')
            }
            if (part) {
                lines[lines.length - 1] += `${open}${escapeXml(part)}${close}`
            }
        })
    })

    return lines
}

/** Highlighted HTML for the preview; unknown languages are only escaped. */
export function highlightToHTML(
    hljs: HLJSApi,
    code: string,
    language?: string | null,
    lineNumbers?: LineNumberOptions | null
) {
    const lang = getLanguage(hljs, language)

    if (lineNumbers) {
        const lines = highlightToLines(hljs, code, lang)

        // a trailing line break doesn't start a line of its own
        if (lines.length > 1 && lines[lines.length - 1] === '') {
            lines.pop()
        }

        if (lines.length > 1 || lineNumbers.singleLine) {
            return lines.map((line) => `<span class="hljs-ln-line">${line}</span>`).join('\n')
        }
    }

    return lang
        ? hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
        : escapeXml(code)
}

/** Positions (offsets in `code`) where each line starts, for the line number widgets. */
export function getLineStarts(code: string, lineNumbers: LineNumberOptions) {
    const starts = [0]
    const re = /\r\n|\r|\n/g
    let match: RegExpExecArray | null

    while ((match = re.exec(code))) {
        starts.push(match.index + match[0].length)
    }

    if (starts.length > 1 && starts[starts.length - 1] === code.length) {
        starts.pop()
    }

    return starts.length > 1 || lineNumbers.singleLine ? starts : []
}

export function normalizeLineNumbers(
    option?: boolean | Partial<LineNumberOptions> | null
): LineNumberOptions | null {
    if (!option) {
        return null
    }

    const { startFrom = 1, singleLine = false } = option === true ? {} : option

    return { startFrom: Number.isFinite(startFrom) ? startFrom : 1, singleLine }
}
