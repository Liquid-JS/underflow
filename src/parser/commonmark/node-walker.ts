import { NodeWalker as BaseNodeWalker } from '../types/node'
import type { BaseNode } from './node'

export class NodeWalker implements BaseNodeWalker {
    current: BaseNode | null
    root: BaseNode
    entering: boolean

    constructor(root: BaseNode) {
        this.current = root
        this.root = root
        this.entering = true
    }

    next() {
        const cur = this.current
        const entering = this.entering

        if (cur === null) {
            return null
        }

        const container = cur.isContainer()

        if (entering && container) {
            if (cur.firstChild) {
                this.current = cur.firstChild
                this.entering = true
            } else {
                // stay on node but exit
                this.entering = false
            }
        } else if (cur === this.root) {
            this.current = null
        } else if (cur.next === null) {
            this.current = cur.parent
            this.entering = false
        } else {
            this.current = cur.next
            this.entering = true
        }

        return { entering, node: cur }
    }

    resumeAt(node: BaseNode, entering: boolean) {
        this.current = node
        this.entering = entering === true
    }
}
