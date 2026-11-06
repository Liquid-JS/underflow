import { BlockNode } from './node'

export const CODE_INDENT = 4
export const C_TAB = 9
export const C_NEWLINE = 10
export const C_GREATERTHAN = 62
export const C_LESSTHAN = 60
export const C_SPACE = 32
export const C_OPEN_BRACKET = 91

export const reNonSpace = /[^ \t\f\v\r\n]/

export const reClosingCodeFence = /^(?:`{3,}|~{3,})(?=[ \t]*$)/

// Returns true if a blank line separates the block from the next one. Blocks end
// at their last line of content (lists and list items at the end of their last
// child), so a blank line inside a block quote doesn't count.
export function endsWithBlankLine(block: BlockNode) {
    return !!block.next && block.sourcepos![1][0] !== block.next.sourcepos![0][0] - 1
}

export function peek(ln: string, pos: number) {
    if (pos < ln.length) {
        return ln.charCodeAt(pos)
    }
    return -1
}

// Returns true if string contains only space characters.
export function isBlank(s: string) {
    return !reNonSpace.test(s)
}

export function isSpaceOrTab(c: number) {
    return c === C_SPACE || c === C_TAB
}
