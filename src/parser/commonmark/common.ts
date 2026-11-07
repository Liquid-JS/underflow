import { decodeHTMLStrict } from 'entities'

export const ENTITY = '&(?:#x[a-f0-9]{1,6}|#[0-9]{1,7}|[a-z][a-z0-9]{1,31});'
const C_BACKSLASH = 92
const reBackslashOrAmp = /[\\&]/
export const ESCAPABLE = '[!"#$%&\'()*+,./:;<=>?@[\\\\\\]^_`{|}~-]'
const reEntityOrEscapedChar = new RegExp(`\\\\${ESCAPABLE}|${ENTITY}`, 'gi')
const XMLSPECIAL = '[&<>"]'
const reXmlSpecial = new RegExp(XMLSPECIAL, 'g')

const unescapeChar = (s: string) => {
    if (s.charCodeAt(0) === C_BACKSLASH) {
        return s.charAt(1)
    }
    return decodeHTMLStrict(s)
}

// Replace entities and backslash escapes with literal characters.
export function unescapeString(s: string) {
    if (reBackslashOrAmp.test(s)) {
        return s.replace(reEntityOrEscapedChar, unescapeChar)
    }
    return s
}

const reEscapedChar = /(%[0-9a-f]{2})/i

/** Percent-encodes the characters a URI can't contain, keeping its escape sequences; lone surrogates become U+FFFD. */
export function normalizeURI(uri: string) {
    return uri
        .toWellFormed()
        .split(reEscapedChar)
        .map((part, index) => (index % 2 ? part : encodeURI(part)))
        .join('')
}

function replaceUnsafeChar(s: string) {
    switch (s) {
        case '&':
            return '&amp;'
        case '<':
            return '&lt;'
        case '>':
            return '&gt;'
        case '"':
            return '&quot;'
        default:
            return s
    }
}

export function escapeXml(s: string) {
    if (reXmlSpecial.test(s)) {
        return s.replace(reXmlSpecial, replaceUnsafeChar)
    }
    return s
}

export function last<T>(arr: T[]) {
    if (!arr.length) {
        return null
    }
    return arr[arr.length - 1]
}

export function isEmpty(str: string) {
    if (!str) {
        return true
    }
    return !/[^ \t]+/.test(str)
}
