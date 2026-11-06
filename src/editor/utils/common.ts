import { LinkAttributeNames, LinkAttributes } from '../types/editor'
import { forEachOwnProperties, isNull, isUndefined } from './native'

/**
 * Read lazily, so that importing the editor doesn't touch `navigator` (server-side rendering).
 */
export function isMac() {
    return typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
}

const reSpaceMoreThanOne = /[\u0020]+/g
const reEscapeChars = /[>(){}[\]+-.!#|=]/g
// opening tags and autolinks are matched by a single non-ambiguous pattern
// to avoid catastrophic backtracking on text like `foo <bar baz qux ...`
const reEscapeHTML = /<[a-zA-Z_][^\\>]*>|<(\/)([a-zA-Z_][a-zA-Z0-9\-._]*)\s*\/?>|<!--[^-]+-->/g
const reEscapeBackSlash = /\\[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~\\]/g
const reEscapePairedChars = /[*_~`]/g
const reMdImageSyntax = /!\[.*\]\(.*\)/g
const reEscapedCharInLinkSyntax = /[[\]]/g
const reEscapeBackSlashInSentence = /(?:^|[^\\])\\(?!\\)/g

const XMLSPECIAL = '[&<>"]'
const reXmlSpecial = new RegExp(XMLSPECIAL, 'g')

function replaceUnsafeChar(char: string) {
    switch (char) {
        case '&':
            return '&amp;'
        case '<':
            return '&lt;'
        case '>':
            return '&gt;'
        case '"':
            return '&quot;'
        default:
            return char
    }
}

export function escapeXml(text: string) {
    if (reXmlSpecial.test(text)) {
        return text.replace(reXmlSpecial, replaceUnsafeChar)
    }
    return text
}

const availableLinkAttributes: LinkAttributeNames[] = ['rel', 'target', 'hreflang', 'type']
const reMarkdownTextToEscapeMap = {
    codeblock: /(^ {4}[^\n]+\n*)+/,
    thematicBreak: /^ *((\* *){3,}|(- *){3,} *|(_ *){3,}) */,
    atxHeading: /^(#{1,6}) +[\s\S]+/,
    seTextheading: /^([^\n]+)\n *(=|-){2,} */,
    // a paragraph is followed by the next one without a blank line, so it can turn into a setext underline
    seTextheadingUnderline: /^ {0,3}(=+|-+) *$/,
    blockquote: /^( *>[^\n]+.*)+/,
    list: /^ *(\*+|-+|\++|\d+[.)])( [\s\S]*)?$/,
    def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? */,
    link: /!?\[.*\]\(.*\)/,
    reflink: /!?\[.*\]\s*\[([^\]]*)\]/,
    verticalBar: /\u007C/,
    fencedCodeblock: /^((`|~){3,})/
}

export function sanitizeLinkAttribute(attribute: LinkAttributes) {
    if (!attribute) {
        return null
    }

    const linkAttributes: LinkAttributes = {}

    availableLinkAttributes.forEach((key) => {
        if (!isUndefined(attribute[key])) {
            linkAttributes[key] = attribute[key]
        }
    })

    return linkAttributes
}

function isNeedEscapeText(text: string) {
    let needEscape = false

    forEachOwnProperties(reMarkdownTextToEscapeMap, (reMarkdownTextToEscape) => {
        if (reMarkdownTextToEscape.test(text)) {
            needEscape = true
        }
        return !needEscape
    })

    return needEscape
}

export function escapeTextForLink(text: string) {
    const imageSyntaxRanges: Array<[number, number]> = []
    let result = reMdImageSyntax.exec(text)

    while (result) {
        imageSyntaxRanges.push([result.index, result.index + result[0].length])
        result = reMdImageSyntax.exec(text)
    }

    return text.replace(reEscapedCharInLinkSyntax, (matched, offset) => {
        const isDelimiter = imageSyntaxRanges.some((range) => offset > range[0] && offset < range[1])

        return isDelimiter ? matched : `\\${matched}`
    })
}

export function escape(text: string) {
    const aheadReplacer = (matched: string) => `\\${matched}`
    const behindReplacer = (matched: string) => `${matched}\\`

    let escapedText = text.replace(reSpaceMoreThanOne, ' ')

    if (reEscapeBackSlash.test(escapedText)) {
        escapedText = escapedText.replace(reEscapeBackSlash, aheadReplacer)
    }

    if (reEscapeBackSlashInSentence.test(escapedText)) {
        escapedText = escapedText.replace(reEscapeBackSlashInSentence, behindReplacer)
    }

    escapedText = escapedText.replace(reEscapePairedChars, aheadReplacer)

    if (reEscapeHTML.test(escapedText)) {
        escapedText = escapedText.replace(reEscapeHTML, aheadReplacer)
    }

    if (isNeedEscapeText(escapedText)) {
        escapedText = escapedText.replace(reEscapeChars, aheadReplacer)
    }

    return escapedText
}

export function quote(text: string) {
    let result

    if (text.indexOf('"') === -1) {
        result = '""'
    } else {
        result = text.indexOf("'") === -1 ? "''" : '()'
    }

    return result[0] + text + result[1]
}

export function isNil(value: unknown): value is null | undefined {
    return isNull(value) || isUndefined(value)
}

export function shallowEqual(o1: Record<string, any> | null, o2: Record<string, any> | null) {
    if (o1 === null && o1 === o2) {
        return true
    }
    if (typeof o1 !== 'object' || typeof o2 !== 'object' || isNil(o1) || isNil(o2)) {
        return o1 === o2
    }
    for (const key in o1) {
        if (o1[key] !== o2[key]) {
            return false
        }
    }
    for (const key in o2) {
        if (!(key in o1)) {
            return false
        }
    }

    return true
}

export function last<T>(arr: T[]) {
    return arr[arr.length - 1]
}

export function between(value: number, min: number, max: number) {
    return value >= min && value <= max
}

function isObject(obj: unknown): obj is object {
    return typeof obj === 'object' && obj !== null
}

export function deepMergedCopy<T1 extends Record<string, any>, T2 extends Record<string, any>>(
    targetObj: T1,
    obj: T2
) {
    const resultObj = { ...targetObj } as T1 & T2

    if (targetObj && obj) {
        Object.keys(obj).forEach((prop: keyof T2) => {
            if (isObject(resultObj[prop])) {
                if (Array.isArray(obj[prop])) {
                    resultObj[prop as keyof T1 & T2] = deepCopyArray(obj[prop]) as any
                } else if (resultObj.hasOwnProperty(prop)) {
                    resultObj[prop] = deepMergedCopy(resultObj[prop], obj[prop])
                } else {
                    resultObj[prop as keyof T1 & T2] = deepCopy(obj[prop])
                }
            } else {
                resultObj[prop as keyof T1 & T2] = obj[prop]
            }
        })
    }

    return resultObj
}

export function deepCopyArray<T extends any[]>(items: T): T {
    return items.map((item) => {
        if (isObject(item)) {
            return Array.isArray(item) ? deepCopyArray(item) : deepCopy(item)
        }
        return item
    }) as T
}

export function deepCopy<T extends Record<string, any>>(obj: T) {
    const keys = Object.keys(obj)

    if (!keys.length) {
        return obj
    }

    return keys.reduce((acc, prop: keyof T) => {
        if (isObject(obj[prop])) {
            acc[prop] = Array.isArray(obj[prop]) ? deepCopyArray(obj[prop]) : deepCopy(obj[prop])
        } else {
            acc[prop] = obj[prop]
        }
        return acc
    }, {} as T)
}

export function assign(targetObj: Record<string, any>, obj: Record<string, any> = {}) {
    Object.keys(obj).forEach((prop) => {
        if (targetObj.hasOwnProperty(prop) && typeof targetObj[prop] === 'object') {
            if (Array.isArray(obj[prop])) {
                targetObj[prop] = obj[prop]
            } else {
                assign(targetObj[prop], obj[prop])
            }
        } else {
            targetObj[prop] = obj[prop]
        }
    })
    return targetObj
}

export function getSortedNumPair(valueA: number, valueB: number) {
    return valueA > valueB ? [valueB, valueA] : [valueA, valueB]
}

// ASCII punctuation and general/supplemental unicode punctuation,
// used to check the flanking rules of emphasis delimiters
// ASCII punctuation plus every Unicode punctuation (P) and symbol (S) character, the same set
// the markdown parser uses to decide whether emphasis delimiters can open or close (CommonMark 0.31).
// The property escapes stay outside the character class: V8 doesn't match astral characters
// against `[\p{S}]$`, while `\p{S}$` works.
const reStartWithPunct = /^(?:[!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~]|\p{P}|\p{S})/u
const reEndWithPunct = /(?:[!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~]|\p{P}|\p{S})$/u
const reStartWithSpaceOrPunct = /^(?:\s|[!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~]|\p{P}|\p{S})/u
const reEndWithSpaceOrPunct = /(?:\s|[!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~]|\p{P}|\p{S})$/u

export function isStartWithPunct(text?: string | null) {
    return !!text && reStartWithPunct.test(text)
}

export function isEndWithPunct(text?: string | null) {
    return !!text && reEndWithPunct.test(text)
}

export function isStartWithSpaceOrPunct(text?: string | null) {
    return !text || reStartWithSpaceOrPunct.test(text)
}

export function isEndWithSpaceOrPunct(text?: string | null) {
    return !text || reEndWithSpaceOrPunct.test(text)
}
