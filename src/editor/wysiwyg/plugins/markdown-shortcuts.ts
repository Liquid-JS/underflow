import { Schema } from 'prosemirror-model'
import { InputRule, textblockTypeInputRule, wrappingInputRule } from 'prosemirror-inputrules'
import { findWrapping } from 'prosemirror-transform'

/** `[ ] ` or `[x] ` at the start of a paragraph makes it a task list item. */
function taskRule(schema: Schema) {
    const { listItem, bulletList } = schema.nodes

    return new InputRule(/^\[([ xX])\]\s$/, (state, match, start, end) => {
        const checked = match[1] !== ' '
        const tr = state.tr.delete(start, end)
        const $pos = tr.doc.resolve(start)
        const item = $pos.depth > 1 ? $pos.node(-1) : null

        // the first paragraph of a list item: make the item a task
        if (item?.type === listItem && $pos.index(-1) === 0) {
            return tr.setNodeMarkup($pos.before(-1), null, { ...item.attrs, task: true, checked })
        }

        const range = $pos.blockRange()
        const wrapping = range && findWrapping(range, bulletList)

        if (!range || !wrapping) {
            return null
        }

        return tr.wrap(
            range,
            wrapping.map((wrapper) =>
                wrapper.type === listItem ? { type: listItem, attrs: { task: true, checked } } : wrapper
            )
        )
    })
}

/**
 * Markdown typed at the start of a paragraph turns it into the block it stands for; Backspace right after
 * undoes that.
 */
export function markdownShortcutRules(schema: Schema) {
    const { heading, blockQuote, bulletList, orderedList, codeBlock } = schema.nodes

    return [
        textblockTypeInputRule(/^(#{1,6})\s$/, heading, (match) => ({ level: match[1].length })),
        wrappingInputRule(/^\s*>\s$/, blockQuote),
        taskRule(schema),
        wrappingInputRule(/^\s*[-+*]\s$/, bulletList),
        wrappingInputRule(
            /^(\d+)\.\s$/,
            orderedList,
            (match) => ({ order: Number(match[1]) }),
            (match, node) => node.childCount + node.attrs.order === Number(match[1])
        ),
        textblockTypeInputRule(/^```([^\s`]*)\s$/, codeBlock, (match) => ({
            language: match[1] || null
        }))
    ]
}
