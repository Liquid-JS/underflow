import { history } from 'prosemirror-history'
import { MdEditor } from '../src/editor/markdown/md-editor'
import { HTMLConvertorMap } from '@liquid-js/underflow/parser'

export function getTextContent(editor: MdEditor) {
    const { doc } = editor.view.state
    const docSize = doc.content.size
    let text = ''

    doc.nodesBetween(0, docSize, (node, pos) => {
        if (node.isText) {
            text += node.text!.slice(Math.max(0, pos) - pos, docSize - pos)
        } else if (node.isBlock && pos > 0) {
            text += '\n'
        }
    })

    return text
}

export function removeDataAttr(html: string) {
    return html.replace(/\sdata-nodeid="\d{1,}"/g, '').trim()
}

export function createHTMLrenderer() {
    const customHTMLRenderer: HTMLConvertorMap = {
        htmlBlock: {
            // @ts-expect-error nested html convertor maps are not modelled by HTMLConvertorMap
            iframe: (node: MdLikeNode) => [
                { type: 'openTag', tagName: 'iframe', outerNewLine: true, attributes: node.attrs },
                { type: 'html', content: node.childrenHTML },
                { type: 'closeTag', tagName: 'iframe', outerNewLine: true }
            ]
        },
        htmlInline: {
            // @ts-expect-error nested html convertor maps are not modelled by HTMLConvertorMap
            big: (node: MdLikeNode, { entering }: Context) => entering
                ? { type: 'openTag', tagName: 'big', attributes: node.attrs }
                : { type: 'closeTag', tagName: 'big' }
        }
    }

    return customHTMLRenderer
}

export class TestEditorWithNoneDelayHistory extends MdEditor {
    get defaultPlugins() {
        return [...this.keymaps, history({ newGroupDelay: -1 })]
    }
}
