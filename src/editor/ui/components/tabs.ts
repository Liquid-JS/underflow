import { TabInfo } from '../../types/ui'
import { cls } from '../../utils/dom'
import { html } from '../vdom/template'
import { Component } from '../vdom/component'

interface Props {
    tabs: TabInfo[]
    activeTab: string
    /** the tabs stay focusable, but don't switch */
    disabled?: boolean
    /** `false` takes the tabs out of the Tab order */
    tabbable?: boolean
    onClick: (ev: MouseEvent | KeyboardEvent, activeTab: string) => void
}

export class Tabs extends Component<Props> {
    private toggleTab(ev: MouseEvent | KeyboardEvent, activeTab: string) {
        if (!this.props.disabled) {
            this.props.onClick(ev, activeTab)
        }
    }

    private handleKeydown(ev: KeyboardEvent, index: number) {
        const { tabs } = this.props
        let nextIndex = index

        if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
            nextIndex = (index + (ev.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length
        } else if (ev.key !== 'Enter' && ev.key !== ' ') {
            return
        }

        ev.preventDefault()
        if (this.props.disabled) {
            return
        }
        this.toggleTab(ev, tabs[nextIndex].name)
        this.refs.el.querySelectorAll<HTMLElement>('[role="tab"]')[nextIndex].focus()
    }

    render() {
        return html`
            <div class="${cls('tabs')}" role="tablist" ref=${(el: HTMLElement) => (this.refs.el = el)}>
                ${this.props.tabs.map(({ name, text }, index) => {
                    const isActive = this.props.activeTab === name

                    return html`
                        <div
                            class="tab-item${isActive ? ' active' : ''}"
                            onClick=${(ev: MouseEvent) => this.toggleTab(ev, name)}
                            onKeydown=${(ev: KeyboardEvent) => this.handleKeydown(ev, index)}
                            role="tab"
                            aria-label="${text}"
                            aria-selected="${isActive ? 'true' : 'false'}"
                            aria-disabled=${this.props.disabled ? 'true' : null}
                            tabindex="${isActive && this.props.tabbable !== false ? '0' : '-1'}"
                        >
                            ${text}
                        </div>
                    `
                })}
            </div>
        `
    }
}
