import { ContextMenuItem, ExecCommand, Pos, VNode } from '../../types/ui'
import { Emitter } from '../../types/event'
import { closest, cls, getEventTarget } from '../../utils/dom'
import { html } from '../vdom/template'
import { Component } from '../vdom/component'

interface State {
    pos: Pos | null
    menuGroups: ContextMenuItem[][]
}

interface Props {
    eventEmitter: Emitter
    execCommand: ExecCommand
}

export class ContextMenu extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            pos: null,
            menuGroups: []
        }
        this.addEvent()
    }

    addEvent() {
        this.props.eventEmitter.listen('contextmenu', ({ pos, menuGroups }) => {
            this.setState({ pos, menuGroups })
        })
    }

    mounted() {
        document.addEventListener('click', this.handleClickDocument)
    }

    beforeDestroy() {
        document.removeEventListener('click', this.handleClickDocument)
    }

    updated() {
        if (this.state.pos && this.refs.el) {
            this.adjustPosition()
        }
    }

    // keep the menu inside the viewport when it is opened near the right or bottom edge
    private adjustPosition() {
        const { el } = this.refs
        const { right, bottom, width, height } = el.getBoundingClientRect()

        if (right > window.innerWidth) {
            el.style.left = `${Math.max(el.offsetLeft - width, 0)}px`
        }
        if (bottom > window.innerHeight) {
            el.style.top = `${Math.max(el.offsetTop - height, 0)}px`
        }
    }

    private handleClickDocument = (ev: MouseEvent) => {
        if (!closest(getEventTarget(ev), `.${cls('context-menu')}`)) {
            this.setState({ pos: null })
        }
    }

    private getMenuGroupElements() {
        const { pos, menuGroups } = this.state

        return pos
            ? menuGroups.reduce((acc, group) => {
                const menuItem: VNode[] = []

                group.forEach(({ label, className = false, icon, disabled, onClick }) => {
                    const handleClick = () => {
                        if (!disabled) {
                            onClick!()
                            this.setState({ pos: null })
                        }
                    }

                    menuItem.push(
                        html`
                                <li
                                    onClick=${handleClick}
                                    class="menu-item${disabled ? ' disabled' : ''}"
                                    role="menuitem"
                                >
                                    <span class="${className}">
                                        ${icon ? html`<span class=${cls('icon')} aria-hidden="true" innerHTML=${icon}></span>` : null}
                                        ${label}
                                    </span>
                                </li>
                            `
                    )
                })

                acc.push(
                    html`<ul class="menu-group" role="group">
                            ${menuItem}
                        </ul>`
                )
                return acc
            }, [] as VNode[])
            : []
    }

    render() {
        const style = { display: this.state.pos ? 'block' : 'none', ...this.state.pos }

        return html`<div
            class="${cls('context-menu')}"
            style=${style}
            role="menu"
            ref=${(el: HTMLElement) => (this.refs.el = el)}
        >
            ${this.getMenuGroupElements()}
        </div>`
    }
}
