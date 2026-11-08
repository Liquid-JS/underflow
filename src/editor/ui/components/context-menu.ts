import { ContextMenuItem, ExecCommand, Pos, VNode } from '../../types/ui'
import { Emitter } from '../../types/event'
import { closest, cls, getEventTarget } from '../../utils/dom'
import { html } from '../vdom/template'
import { Component } from '../vdom/component'
import { TopLayer } from '../top-layer'

interface State {
    pos: Pos | null
    menuGroups: ContextMenuItem[][]
}

interface Props {
    eventEmitter: Emitter
    execCommand: ExecCommand
}

export class ContextMenu extends Component<Props, State> {
    /** above the page, so an ancestor that clips the editor doesn't cut the menu off */
    private topLayer = new TopLayer()

    private open = false

    /** where the focus was when the menu opened, and goes back to */
    private returnFocus: HTMLElement | null = null

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
        // its items change the text
        this.props.eventEmitter.listen('changeReadonly', (readonly: boolean) => {
            if (readonly) {
                this.setState({ pos: null })
            }
        })
    }

    mounted() {
        document.addEventListener('click', this.handleClickDocument)
    }

    beforeDestroy() {
        this.topLayer.hide()
        document.removeEventListener('click', this.handleClickDocument)
    }

    updated() {
        const open = !!this.state.pos && !!this.refs.el

        if (open) {
            this.topLayer.show(this.refs.el)
            this.adjustPosition()
        } else {
            this.topLayer.hide()
        }

        // as a menu, it takes the focus while it's open, and gives it back
        if (open && !this.open) {
            this.returnFocus = document.activeElement as HTMLElement | null
            this.items()[0]?.focus()
        } else if (!open && this.open) {
            const { activeElement } = document

            if (!activeElement || activeElement === document.body || this.refs.el.contains(activeElement)) {
                this.returnFocus?.focus()
            }
            this.returnFocus = null
        }
        this.open = open
    }

    private items() {
        return Array.from(this.refs.el.querySelectorAll<HTMLElement>('[role="menuitem"]'))
    }

    private close() {
        this.setState({ pos: null })
    }

    // the menu's keys: arrows, Home and End move between the items, Enter and Space choose one, Escape and Tab close it
    private handleKeydown = (ev: KeyboardEvent) => {
        const items = this.items()
        const index = items.indexOf(document.activeElement as HTMLElement)
        const { length } = items
        const move: Record<string, number> = {
            ArrowDown: (index + 1) % length,
            ArrowUp: (index - 1 + length) % length,
            Home: 0,
            End: length - 1
        }

        if (ev.key in move) {
            items[move[ev.key]].focus()
        } else if (ev.key === 'Enter' || ev.key === ' ') {
            items[index]?.click()
        } else if (ev.key === 'Escape' || ev.key === 'Tab') {
            this.close()
        } else {
            return
        }
        ev.preventDefault()
        ev.stopPropagation()
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
            this.close()
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
                            this.close()
                            onClick!()
                        }
                    }

                    menuItem.push(
                        html`
                                <li
                                    onClick=${handleClick}
                                    class="menu-item${disabled ? ' disabled' : ''}"
                                    role="menuitem"
                                    tabindex="-1"
                                    aria-disabled=${disabled ? 'true' : null}
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
            onKeydown=${this.handleKeydown}
            ref=${(el: HTMLElement) => (this.refs.el = el)}
        >
            ${this.getMenuGroupElements()}
        </div>`
    }
}
