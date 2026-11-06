import { Component as IComponent, VNode } from '../../types/ui'
import { shallowEqual } from '../../utils/common'
import { rerender } from './renderer'

export abstract class Component<T = {}, R = {}> implements IComponent<T, R> {
    props: T

    state: R

    refs: Record<string, HTMLElement>

    vnode!: VNode

    constructor(props: T) {
        this.props = props
        this.state = {} as R
        this.refs = {}
    }

    setState(state: Partial<R>) {
        const newState = { ...this.state, ...state }

        if (!shallowEqual(this.state as Record<string, any>, newState)) {
            this.state = newState
            rerender(this as unknown as Component)
        }
    }

    abstract render(): VNode
}
