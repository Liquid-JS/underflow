import { DOMOutputSpec } from 'prosemirror-model'

import { Mark } from '../../spec/mark'

/** An inline HTML tag that WYSIWYG can't show, kept as its source text and written back as it is. */
export class HTMLSourceMark extends Mark {
    get name() {
        return 'htmlInlineSource'
    }

    get schema() {
        return {
            code: true,
            inclusive: false,
            excludes: '_',
            parseDOM: [{ tag: 'code[data-html-source]', priority: 60 }],
            toDOM: (): DOMOutputSpec => ['code', { 'data-html-source': 'true' }]
        }
    }
}
