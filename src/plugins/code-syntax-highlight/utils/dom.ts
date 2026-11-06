export function removeNode(node: Node) {
    if (node.parentNode) {
        node.parentNode.removeChild(node)
    }
}

const CLS_PREFIX = 'uf-'

export function cls(...names: string[]) {
    return names.map((className) => `${CLS_PREFIX}${className}`).join(' ')
}
