import { shallowEqual } from '../../utils/common'
import { isTextNode } from '../../utils/dom'
import { isNumber, isObject } from '../../utils/native'
import { StyleProps } from '../../types/ui'
import { VNode } from './vnode'

type ConditionFn = (propName: string) => boolean
type Props = Record<string, any>

export function createNode(vnode: VNode) {
    let node: Node

    if (vnode.type === 'TEXT_NODE') {
        node = document.createTextNode(vnode.props.nodeValue)
    } else {
        node = document.createElement(vnode.type as string)
        setProps(node, {}, vnode.props)
    }

    return node
}

export function removeNode(vnode: VNode, parentNode: Node) {
    if (vnode.node) {
        parentNode.removeChild(vnode.node)
    } else {
        removeNode(vnode.firstChild!, parentNode)
    }
}

export function innerDiff(node: Node, prevProps: Props, nextProps: Props) {
    Object.keys(prevProps).forEach((propName) => {
        if (/^on/.test(propName)) {
            if (!nextProps[propName] || prevProps[propName] !== nextProps[propName]) {
                const eventName = propName.slice(2).toLowerCase()

                node.removeEventListener(eventName, prevProps[propName])
            }
        } else if (propName === 'innerHTML') {
            if (nextProps[propName] == null) {
                (node as Element).innerHTML = ''
            }
        } else if (propName !== 'children' && !nextProps[propName] && !isTextNode(node)) {
            (node as Element).removeAttribute(propName)
        }
    })

    setProps(
        node,
        prevProps,
        nextProps,
        (propName) => !shallowEqual(prevProps[propName], nextProps[propName])
    )
}

const reNonDimension = /acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i

function setProps(node: Node, prevProps: Props, props: Props, condition?: ConditionFn) {
    Object.keys(props).forEach((propName) => {
        if (!condition || condition(propName)) {
            if (/^on/.test(propName)) {
                const eventName = propName.slice(2).toLowerCase()

                node.addEventListener(eventName, props[propName])
            } else if (propName === 'nodeValue') {
                node[propName] = props[propName]
            } else if (propName === 'innerHTML') {
                // markup the code provides, like an icon's SVG; never content from users
                (node as Element).innerHTML = props[propName] ?? ''
            } else if (propName === 'style' && isObject(props[propName])) {
                setStyleProps(node as HTMLElement, prevProps[propName], props[propName])
            } else if (propName !== 'children') {
                // false, null and undefined leave the attribute out instead of writing "null" etc.
                if (props[propName] === false || props[propName] == null) {
                    (node as HTMLElement).removeAttribute(propName)
                } else {
                    (node as HTMLElement).setAttribute(propName, props[propName])
                }
            }
        }
    })
}

function setStyleProps(node: HTMLElement, prevStyleProps: StyleProps | null, styleProps: StyleProps) {
    // StyleProps only has the string properties of CSSStyleDeclaration
    const style = node.style as unknown as Record<string, string>

    if (prevStyleProps) {
        Object.keys(prevStyleProps).forEach((styleProp) => {
            style[styleProp] = ''
        })
    }

    Object.entries(styleProps).forEach(([styleProp, value]) => {
        style[styleProp] = isNumber(value) && !reNonDimension.test(styleProp) ? `${value}px` : String(value)
    })
}
