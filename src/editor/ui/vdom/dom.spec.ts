import { VNode } from '../../types/ui'
import { createNode, innerDiff } from './dom'
import { html } from './template'

describe('vdom props', () => {
    it('should leave out attributes whose value is null, undefined or false', () => {
        const node = createNode(
            html`<div style=${null} title=${undefined} hidden=${false} class="a"></div>` as VNode
        ) as HTMLElement

        expect(node.hasAttribute('style')).toBe(false)
        expect(node.hasAttribute('title')).toBe(false)
        expect(node.hasAttribute('hidden')).toBe(false)
        expect(node.getAttribute('class')).toBe('a')
    })

    it('should remove an attribute when its value becomes null', () => {
        const node = createNode(html`<div title="a"></div>` as VNode) as HTMLElement

        innerDiff(node, { title: 'a' }, { title: null })

        expect(node.hasAttribute('title')).toBe(false)
    })

    it('should set innerHTML as markup, not as an attribute', () => {
        const svg = '<svg viewBox="0 0 24 24"><path d="M0 0h24"></path></svg>'
        const node = createNode(html`<span innerHTML=${svg}></span>` as VNode) as HTMLElement

        expect(node.hasAttribute('innerHTML')).toBe(false)
        expect(node.firstElementChild!.namespaceURI).toBe('http://www.w3.org/2000/svg')

        innerDiff(node, { innerHTML: svg }, { innerHTML: '<b>a</b>' })

        expect(node.innerHTML).toBe('<b>a</b>')

        innerDiff(node, { innerHTML: '<b>a</b>' }, {})

        expect(node.innerHTML).toBe('')
    })
})
