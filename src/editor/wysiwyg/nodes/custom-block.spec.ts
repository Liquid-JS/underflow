import { oneLineTrim } from 'common-tags'
import { ToDOMAdaptor } from '../../types/convertor'
import { WwToDOMAdaptor } from '../adaptor/ww-to-dom-adaptor'
import { WysiwygEditor } from '../ww-editor'
import { EventEmitter } from '../../event/event-emitter'
import { HTMLConvertorMap } from '../../../parser/types/renderer'

let wwe: WysiwygEditor; let em: EventEmitter; let toDOMAdaptor: ToDOMAdaptor

function createCustomBlockNode() {
    const customBlock = wwe.schema.nodes.customBlock.create(
        { info: 'myCustom' },
        wwe.schema.text('myCustom Node!!')
    )
    const doc = wwe.schema.nodes.doc.create(null, customBlock)

    return doc
}

beforeEach(() => {
    const convertors: HTMLConvertorMap = {
        myCustom: (node) => {
            const span = document.createElement('span')

            span.innerHTML = node.literal!

            return [
                { type: 'openTag', tagName: 'div', attributes: { 'data-custom': 'myCustom' } },
                { type: 'html', content: span.outerHTML },
                { type: 'closeTag', tagName: 'div' }
            ]
        }
    }

    toDOMAdaptor = new WwToDOMAdaptor({}, convertors)
    em = new EventEmitter()
    wwe = new WysiwygEditor(em, { toDOMAdaptor })
    wwe.setModel(createCustomBlockNode())
})

afterEach(() => {
    wwe.destroy()
})

it('custom block node should be rendered in wysiwyg editor properly', () => {
    const expected = oneLineTrim`
    <div data-custom="myCustom">
      <span>myCustom Node!!</span>
    </div>
  `

    expect(wwe.getHTML()).toContain(expected)
})
