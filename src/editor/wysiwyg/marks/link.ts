import { Mark as ProsemirrorMark, DOMOutputSpec } from 'prosemirror-model'
import { toggleMark } from 'prosemirror-commands'

import { EditorCommand } from '../../types/spec'
import { LinkAttributes } from '../../types/editor'
import { Mark } from '../../spec/mark'
import { sanitizeHTML } from '../../sanitizer/html-sanitizer'
import { createTextNode } from '../../helper/manipulation'
import { getCustomAttrs, getDefaultCustomAttrs } from '../helper/node'

const reScriptURL = /^(?:java|vb|live)script:/i

// browsers ignore control characters and whitespace in the scheme (e.g. `java\tscript:`)
function isScriptURL(url: string) {

    return reScriptURL.test(url.replace(/[\u0000-\u0020\u007f]/g, ''))
}

export class Link extends Mark {
    private linkAttributes: LinkAttributes

    constructor(linkAttributes: LinkAttributes) {
        super()
        this.linkAttributes = linkAttributes
    }

    get name() {
        return 'link'
    }

    get schema() {
        return {
            attrs: {
                linkUrl: { default: '' },
                title: { default: null },
                rawHTML: { default: null },
                ...getDefaultCustomAttrs()
            },
            inclusive: false,
            parseDOM: [
                {
                    tag: 'a[href]',
                    getAttrs: (dom: Node | string) => {
                        const sanitizedDOM = sanitizeHTML<DocumentFragment>(dom, { RETURN_DOM_FRAGMENT: true })
                            .firstChild as HTMLElement
                        const href = sanitizedDOM.getAttribute('href') || ''
                        const title = sanitizedDOM.getAttribute('title') || ''
                        const rawHTML = sanitizedDOM.getAttribute('data-raw-html')

                        return {
                            linkUrl: href,
                            title,
                            ...(rawHTML && { rawHTML })
                        }
                    }
                }
            ],
            toDOM: ({ attrs }: ProsemirrorMark): DOMOutputSpec => [
                attrs.rawHTML || 'a',
                {
                    // like the sanitized preview, script urls get no href
                    ...(!isScriptURL(attrs.linkUrl) && { href: attrs.linkUrl }),
                    ...this.linkAttributes,
                    ...getCustomAttrs(attrs)
                }
            ]
        }
    }

    private addLink(): EditorCommand {
        return (payload) => (state, dispatch) => {
            const { linkUrl, linkText = '' } = payload!
            const { schema, tr, selection } = state
            const { empty, from, to } = selection

            if (from && to && linkUrl) {
                const attrs = { linkUrl }
                const mark = schema.mark('link', attrs)
                // replace the selection only when the link text was changed, to keep the formatting otherwise
                const textChanged = linkText && linkText !== state.doc.textBetween(from, to, '\n')

                if (empty ? linkText : textChanged) {
                    const node = createTextNode(schema, linkText, [mark])

                    tr.replaceRangeWith(from, to, node)
                } else {
                    tr.addMark(from, to, mark)
                }

                dispatch!(tr.scrollIntoView())

                return true
            }

            return false
        }
    }

    private toggleLink(): EditorCommand {
        return (payload) => (state, dispatch) =>
            toggleMark(state.schema.marks.link, payload)(state, dispatch)
    }

    commands() {
        return {
            addLink: this.addLink(),
            toggleLink: this.toggleLink()
        }
    }
}
