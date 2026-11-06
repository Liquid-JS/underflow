import type { RefDefNode } from './commonmark/node'

export function last<T>(arr: T[]): T
export function last(arr: string): string

export function last<T>(arr: T[] | string) {
    return arr[arr.length - 1]
}

// normalize a reference in reference link (remove []s, trim,
// collapse internal space, unicode case fold.
// See commonmark/commonmark.js#168.
export function normalizeReference(str: string) {
    const trimmed = str
        .slice(1, str.length - 1)
        .trim()
        .replace(/[ \t\r\n]+/g, ' ')

    // Dotless i (U+0131) has no default CaseFolding.txt entry, so it folds to
    // itself (the I to dotless i mapping is Turkic-only), but it uppercases to
    // ASCII I, so toLowerCase/toUpperCase would merge it with i. Fold the runs
    // between occurrences instead. A run boundary can only affect final sigma,
    // whose two lowercase forms uppercase alike; every other mapping these
    // locale-independent methods apply is context-free.
    if (trimmed.indexOf('\u0131') === -1) {
        return trimmed.toLowerCase().toUpperCase()
    }
    return trimmed.replace(/[^\u0131]+/g, (part) => part.toLowerCase().toUpperCase())
}

export function iterateObject<T extends object>(
    obj: T,
    iteratee: (key: keyof T, value: T[keyof T]) => void
) {
    Object.keys(obj).forEach((key) => {
        iteratee(key as keyof T, obj[key as keyof T])
    })
}

export function omit<T extends object>(obj: T, ...propNames: Array<keyof T>) {
    const resultMap = { ...obj }
    propNames.forEach((key) => {
        delete resultMap[key]
    })
    return resultMap
}

export function isEmptyObj<T extends object>(obj: T) {
    return !Object.keys(obj).length
}

export function clearObj<T extends object>(obj: T) {
    Object.keys(obj).forEach((key) => {
        delete obj[key as keyof T]
    })
}

export function createRefDefState(node: RefDefNode) {
    const { id, title, sourcepos, dest } = node
    return {
        id,
        title,
        sourcepos: sourcepos!,
        unlinked: false,
        destination: dest
    }
}
