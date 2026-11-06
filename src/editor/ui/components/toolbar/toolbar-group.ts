import {
    ExecCommand,
    SetPopupInfo,
    ToolbarGroupInfo,
    SetItemWidth,
    GetBound,
    HideTooltip,
    ShowTooltip,
    ToolbarCustomOptions
} from '../../../types/ui'
import { Emitter } from '../../../types/event'
import { cls } from '../../../utils/dom'
import { html } from '../../vdom/template'
import { Component } from '../../vdom/component'
import { ToolbarButton } from './toolbar-button'
import { CustomToolbarItem } from './custom-toolbar-item'

interface Props {
    tooltipEl: HTMLElement
    disabled: boolean
    group: ToolbarGroupInfo
    hidden: boolean
    hiddenDivider: boolean
    eventEmitter: Emitter
    execCommand: ExecCommand
    setPopupInfo: SetPopupInfo
    showTooltip: ShowTooltip
    hideTooltip: HideTooltip
    getBound: GetBound
    setItemWidth?: SetItemWidth
}

export class ToolbarGroup extends Component<Props> {
    render() {
        const { group, hiddenDivider } = this.props
        const groupStyle = group.hidden ? { display: 'none' } : null
        const dividerStyle = hiddenDivider ? { display: 'none' } : null

        return html`
            <div class="${cls('toolbar-group')}" style=${groupStyle}>
                ${group.map((item: ToolbarCustomOptions) => {
                    const Comp = item.el ? CustomToolbarItem : ToolbarButton

                    return html`<${Comp} key=${item.name} ...${this.props} item=${item} />`
                })}
                <div class="${cls('toolbar-divider')}" style=${dividerStyle}></div>
            </div>
        `
    }
}
