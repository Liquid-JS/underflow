import { isString } from './native'
import { ALTERNATIVE_TAG_FOR_BR, HTML_TAG, OPEN_TAG, reBR } from './constants'
import { isNil } from './common'

export function isPositionInBox(style: CSSStyleDeclaration, offsetX: number, offsetY: number) {
    const left = parseInt(style.left, 10)
    const top = parseInt(style.top, 10)
    const width =
        parseInt(style.width, 10) + parseInt(style.paddingLeft, 10) + parseInt(style.paddingRight, 10)
    const height =
        parseInt(style.height, 10) + parseInt(style.paddingTop, 10) + parseInt(style.paddingBottom, 10)

    return offsetX >= left && offsetX <= left + width && offsetY >= top && offsetY <= top + height
}

const CLS_PREFIX = 'uf-'

export function cls(...names: Array<string | [boolean, string]>) {
    const result = []

    for (const name of names) {
        let className: string | null

        if (Array.isArray(name)) {
            className = name[0] ? name[1] : null
        } else {
            className = name
        }

        if (className) {
            result.push(`${CLS_PREFIX}${className}`)
        }
    }

    return result.join(' ')
}

export function clsWithMdPrefix(...names: string[]) {
    return names.map((className) => `${CLS_PREFIX}md-${className}`).join(' ')
}

export function isTextNode(node: Node) {
    return node?.nodeType === Node.TEXT_NODE
}

export function isElemNode(node: Node) {
    return node && node.nodeType === Node.ELEMENT_NODE
}

export function appendNodes(node: Node, nodesToAppend: Node | Node[]) {
    nodesToAppend = Array.isArray(nodesToAppend) ? Array.from(nodesToAppend) : [nodesToAppend]

    nodesToAppend.forEach((nodeToAppend) => {
        node.appendChild(nodeToAppend)
    })
}

export function insertBeforeNode(insertedNode: Node, node: Node) {
    if (node.parentNode) {
        node.parentNode.insertBefore(insertedNode, node)
    }
}

export function removeNode(node: Node) {
    if (node.parentNode) {
        node.parentNode.removeChild(node)
    }
}

export function unwrapNode(node: Node) {
    const result = []

    while (node.firstChild) {
        result.push(node.firstChild)

        if (node.parentNode) {
            node.parentNode.insertBefore(node.firstChild, node)
        }
    }

    removeNode(node)

    return result
}

export function createElementWith(contents: string | HTMLElement, target?: HTMLElement) {
    const container = document.createElement('div')

    if (isString(contents)) {
        container.innerHTML = contents
    } else {
        container.appendChild(contents)
    }

    const { firstChild } = container

    if (target) {
        target.appendChild(firstChild!)
    }

    return firstChild
}

export function getOuterWidth(el: HTMLElement) {
    const computed = window.getComputedStyle(el)

    return (
        ['margin-left', 'margin-right'].reduce(
            (acc, type) => acc + parseInt(computed.getPropertyValue(type), 10),
            0
        ) + el.offsetWidth
    )
}

export function closest(node: Node, found: string | Node) {
    if (isString(found)) {
        return (node instanceof Element ? node : node.parentElement)?.closest(found) ?? null
    }

    for (let current: Node | null = node; current && current !== document; current = current.parentNode) {
        if (current === found) {
            return current
        }
    }

    return null
}

/**
 * Returns the element where the event originated, even if it comes from inside a shadow DOM
 * (in which case `event.target` is retargeted to the shadow host).
 */
export function getEventTarget(ev: Event) {
    return (ev.composedPath()[0] ?? ev.target) as HTMLElement
}

export function getTotalOffset(el: HTMLElement, root: HTMLElement) {
    let offsetTop = 0
    let offsetLeft = 0

    while (el && el !== root) {
        const { offsetTop: top, offsetLeft: left, offsetParent } = el

        offsetTop += top
        offsetLeft += left
        if (offsetParent === root.offsetParent) {
            break
        }
        el = el.offsetParent as HTMLElement
    }
    return { offsetTop, offsetLeft }
}

export function finalizeHtml(html: Element, needHtmlText: boolean) {
    let result

    if (needHtmlText) {
        result = html.innerHTML
    } else {
        const frag = document.createDocumentFragment()
        const childNodes = Array.from(html.childNodes)
        const { length } = childNodes

        for (let i = 0; i < length; i += 1) {
            frag.appendChild(childNodes[i])
        }
        result = frag
    }

    return result
}

export function setAttributes(attributes: Record<string, any>, element: HTMLElement) {
    Object.keys(attributes).forEach((attrName) => {
        if (isNil(attributes[attrName])) {
            element.removeAttribute(attrName)
        } else {
            element.setAttribute(attrName, attributes[attrName])
        }
    })
}

export function replaceBRWithEmptyBlock(html: string) {
    // remove br in paragraph to compatible with markdown
    let replacedHTML = html.replace(/<p><br\s*\/*><\/p>/gi, '<p></p>')
    const reHTMLTag = new RegExp(HTML_TAG, 'ig')
    const htmlTagMatched = replacedHTML.match(reHTMLTag)

    htmlTagMatched?.forEach((htmlTag, index) => {
        if (reBR.test(htmlTag)) {
            let alternativeTag = ALTERNATIVE_TAG_FOR_BR

            if (index) {
                const prevTag = htmlTagMatched[index - 1]
                const openTagMatched = prevTag.match(OPEN_TAG)

                if (openTagMatched && !/br/i.test(openTagMatched[1])) {
                    const [, tagName] = openTagMatched

                    alternativeTag = `</${tagName}><${tagName}>`
                }
            }
            replacedHTML = replacedHTML.replace(reBR, alternativeTag)
        }
    })

    return replacedHTML
}

export function removeProseMirrorHackNodes(html: string) {
    const reProseMirrorImage = /<img class="ProseMirror-separator" alt="">/g
    const reProseMirrorTrailingBreak = / class="ProseMirror-trailingBreak"/g

    let resultHTML = html

    resultHTML = resultHTML.replace(reProseMirrorImage, '')
    resultHTML = resultHTML.replace(reProseMirrorTrailingBreak, '')

    return resultHTML
}

export function isVisible(element: HTMLElement) {
    return element.offsetWidth > 0 || element.offsetHeight > 0
}
