import { ExecCommand, HidePopup, PopupInfo, Pos, StyleProps } from '../../types/ui'
import { Emitter } from '../../types/event'
import { closest, cls, getEventTarget } from '../../utils/dom'
import { shallowEqual } from '../../utils/common'
import { html } from '../vdom/template'
import { Component } from '../vdom/component'

interface Props {
    show: boolean
    info: PopupInfo
    eventEmitter: Emitter
    hidePopup: HidePopup
    execCommand: ExecCommand
}

interface State {
    popupPos: Pos | null
}

const MARGIN_FROM_RIGHT_SIDE = 20
const FOCUSABLE_SELECTOR =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export class Popup extends Component<Props, State> {
    private handleMousedown = (ev: MouseEvent) => {
        const target = getEventTarget(ev)

        if (!closest(target, `.${cls('popup')}`) && !closest(target, this.props.info.fromEl)) {
            this.props.hidePopup()
        }
    }

    private handleKeydown = (ev: KeyboardEvent) => {
        if (!this.props.show) {
            return
        }

        if (ev.key === 'Escape') {
            this.props.hidePopup()
        } else if (ev.key === 'Tab') {
            this.handleTabKey(ev)
        } else if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
            this.handleArrowKey(ev)
        }
    }

    private getFocusableElements() {
        return Array.from(this.refs.el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    }

    private isMenu() {
        return !!this.refs.el.querySelector('[role="menu"]')
    }

    private handleTabKey(ev: KeyboardEvent) {
    // a menu is closed by Tab, a dialog traps the focus
        if (this.isMenu()) {
            this.props.hidePopup()
            return
        }

        const focusables = this.getFocusableElements()
        const [first] = focusables
        const last = focusables[focusables.length - 1]

        if (!first) {
            return
        }

        if (ev.shiftKey && document.activeElement === first) {
            last.focus()
            ev.preventDefault()
        } else if (!ev.shiftKey && document.activeElement === last) {
            first.focus()
            ev.preventDefault()
        }
    }

    private handleArrowKey(ev: KeyboardEvent) {
        if (!this.isMenu() || !this.refs.el.contains(document.activeElement)) {
            return
        }

        const focusables = this.getFocusableElements()
        const { length } = focusables

        if (!length) {
            return
        }

        const index = focusables.indexOf(document.activeElement as HTMLElement)
        const nextIndex = ev.key === 'ArrowUp' ? index - 1 : index + 1

        focusables[(nextIndex + length) % length].focus()
        ev.preventDefault()
    }

    mounted() {
        document.addEventListener('mousedown', this.handleMousedown)
        document.addEventListener('keydown', this.handleKeydown)
        this.props.eventEmitter.listen('closePopup', this.props.hidePopup)
    }

    beforeDestroy() {
        document.removeEventListener('mousedown', this.handleMousedown)
        document.removeEventListener('keydown', this.handleKeydown)
    }

    updated(prevProps: Props) {
        const { show, info } = this.props

        if (show && info.pos && prevProps.show !== show) {
            const popupPos = { ...info.pos }
            const { offsetWidth } = this.refs.el
            const toolbarEl = closest(this.refs.el, `.${cls('toolbar')}`) as HTMLElement
            const { offsetWidth: toolbarOffsetWidth } = toolbarEl

            if (popupPos.left + offsetWidth >= toolbarOffsetWidth) {
                popupPos.left = toolbarOffsetWidth - offsetWidth - MARGIN_FROM_RIGHT_SIDE
            }
            if (!shallowEqual(this.state.popupPos, popupPos)) {
                this.setState({ popupPos })
            }

            const [firstFocusable] = this.getFocusableElements()

            if (firstFocusable) {
                firstFocusable.focus()
            }

            if (info.fromEl.getAttribute('aria-haspopup')) {
                const menu = this.refs.el.querySelector('[role="menu"]')

                info.fromEl.setAttribute('aria-expanded', 'true')

                if (menu && menu.id) {
                    info.fromEl.setAttribute('aria-controls', menu.id)
                }
            }
        } else if (!show && prevProps.show !== show && info) {
            const { activeElement } = document

            // return the focus to the opener unless it has already moved elsewhere (e.g. to the editor)
            if (
                !activeElement ||
        activeElement === document.body ||
        this.refs.el.contains(activeElement)
            ) {
                info.fromEl.focus()
            }

            if (info.fromEl.getAttribute('aria-haspopup')) {
                info.fromEl.setAttribute('aria-expanded', 'false')
                info.fromEl.removeAttribute('aria-controls')
            }
        }
    }

    render() {
        const { info, show, hidePopup, eventEmitter, execCommand } = this.props
        const { className = '', style, render, initialValues = {} } = info || {}
        const popupStyle: StyleProps = {
            display: 'block',
            ...style,
            // a hidden popup stays hidden whatever display its style sets
            ...(!show && { display: 'none' }),
            ...this.state.popupPos
        }

        return html`
            <div
                class="${cls('popup')} ${className}"
                style=${popupStyle}
                ref=${(el: HTMLElement) => (this.refs.el = el)}
            >
                <div class="${cls('popup-body')}">
                    ${render && render({ eventEmitter, show, hidePopup, execCommand, initialValues })}
                </div>
            </div>
        `
    }
}
