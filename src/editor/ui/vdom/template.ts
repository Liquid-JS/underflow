import { ComponentClass } from '../../types/ui'
import { isBoolean, isNumber, isString } from '../../utils/native'
import { htm } from './htm'
import { VNode } from './vnode'

function createTextNode(text: string) {
    return new VNode('TEXT_NODE', { nodeValue: text }, [])
}

function excludeUnnecessaryChild(child: VNode, flatted: VNode[]) {
    let vnode: VNode | null = child

    if (isBoolean(child) || child == null) {
        vnode = null
    } else if (isString(child) || isNumber(child)) {
        vnode = createTextNode(String(child))
    }
    if (vnode) {
        flatted.push(vnode)
    }
}

function h(type: string | ComponentClass, props: Record<string, any>, ...children: VNode[]) {
    const flatted: VNode[] = []

    children.forEach((child) => {
        if (Array.isArray(child)) {
            child.forEach((vnode) => {
                excludeUnnecessaryChild(vnode, flatted)
            })
        } else {
            excludeUnnecessaryChild(child, flatted)
        }
    })

    return new VNode(type, props || {}, flatted)
}

// @ts-expect-error htm infers a generic return type that does not overlap with VNode
export const html = htm.bind(h) as (strings: TemplateStringsArray, ...values: any[]) => VNode
