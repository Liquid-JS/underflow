import { VNode } from '../../types/ui'
import { html } from './template'
import { Component } from './component'

const falsy = (value: unknown): any => value

class TestComponent extends Component {
    render() {
        return html`<div class="my-comp">test</div>`
    }
}

describe('lit-html syntax', () => {
    it('should be converted as vnode', () => {
        const style = { position: 'absolute', top: 10, marginLeft: 10 }
        const expected = {
            type: 'div',
            props: {
                class: 'my-class',
                style: { position: 'absolute', top: 10, marginLeft: 10 }
            },
            children: [
                {
                    type: 'TEXT_NODE',
                    props: { nodeValue: 'test' },
                    children: []
                }
            ]
        }

        const vnode = html`<div class="my-class" style=${style}>test</div>` as VNode

        expect(vnode).toMatchObject(expected)
    })

    it('should be converted  with children array as vnode', () => {
        const expected = {
            type: 'div',
            props: {
                class: 'my-class'
            },
            children: [
                {
                    type: 'span',
                    props: {},
                    children: [
                        {
                            type: 'TEXT_NODE',
                            props: { nodeValue: '1' },
                            children: []
                        }
                    ]
                },
                {
                    type: 'span',
                    props: {},
                    children: [
                        {
                            type: 'TEXT_NODE',
                            props: { nodeValue: '2' },
                            children: []
                        }
                    ]
                },
                {
                    type: 'span',
                    props: {},
                    children: [
                        {
                            type: 'TEXT_NODE',
                            props: { nodeValue: '3' },
                            children: []
                        }
                    ]
                }
            ]
        }

        const vnode = html`
            <div class="my-class">${[1, 2, 3].map((num) => html`<span>${num}</span>`)}</div>
        `

        expect(vnode).toMatchObject(expected)
    })

    it('should be not converted with null, undefined, false value', () => {
        const expected = {
            type: 'div',
            props: {
                class: 'my-class'
            },
            children: [
                {
                    type: 'TEXT_NODE',
                    props: { nodeValue: 'test' },
                    children: []
                }
            ]
        }

        const vnode = html`
            <div class="my-class">
                ${falsy(null) && html`<span>123</span>`}
                ${

                    falsy(undefined) && html`<span>123</span>`
                }
                ${falsy(false) && html`<span>123</span>`}test
            </div>
        ` as VNode

        expect(vnode).toMatchObject(expected)
    })

    it('should be converted with Component as vnode', () => {
        const expected = {
            type: TestComponent,
            props: {
                'class': 'my-comp',
                'data-id': 'my-comp'
            },
            children: []
        }

        const vnode = html`<${TestComponent} class="my-comp" data-id="my-comp" />` as VNode

        expect(vnode).toMatchObject(expected)
    })
})
