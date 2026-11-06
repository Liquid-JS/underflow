import { Node as ProsemirrorNode, DOMOutputSpec } from 'prosemirror-model'

import { EditorCommand } from '../../types/spec'
import { NodeSchema } from '../../spec/node'
import { sanitizeHTML } from '../../sanitizer/html-sanitizer'

import { getCustomAttrs, getDefaultCustomAttrs } from '../helper/node'

export class ImageNode extends NodeSchema {
    get name() {
        return 'image'
    }

    get schema() {
        return {
            inline: true,
            attrs: {
                imageUrl: { default: '' },
                altText: { default: null },
                title: { default: null },
                rawHTML: { default: null },
                ...getDefaultCustomAttrs()
            },
            group: 'inline',
            selectable: false,
            parseDOM: [
                {
                    tag: 'img[src]',
                    getAttrs: (dom: Node | string) => {
                        const sanitizedDOM = sanitizeHTML<DocumentFragment>(dom, { RETURN_DOM_FRAGMENT: true })
                            .firstChild as HTMLElement
                        const imageUrl = sanitizedDOM.getAttribute('src') || ''
                        const rawHTML = sanitizedDOM.getAttribute('data-raw-html')
                        const altText = sanitizedDOM.getAttribute('alt')
                        const title = sanitizedDOM.getAttribute('title')

                        return {
                            imageUrl,
                            altText,
                            title,
                            ...(rawHTML && { rawHTML })
                        }
                    }
                }
            ],
            toDOM: ({ attrs }: ProsemirrorNode): DOMOutputSpec => [
                attrs.rawHTML || 'img',
                {
                    src: attrs.imageUrl,
                    ...(attrs.altText && { alt: attrs.altText }),
                    ...(attrs.title && { title: attrs.title }),
                    ...getCustomAttrs(attrs)
                }
            ]
        }
    }

    private addImage(): EditorCommand {
        return (payload) => ({ schema, tr }, dispatch) => {
            const { imageUrl, altText } = payload!

            if (!imageUrl) {
                return false
            }

            const node = schema.nodes.image.createAndFill({
                imageUrl,
                ...(altText && { altText })
            })

            dispatch!(tr.replaceSelectionWith(node!).scrollIntoView())

            return true
        }
    }

    commands() {
        return {
            addImage: this.addImage()
        }
    }
}
