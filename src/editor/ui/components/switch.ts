import { Emitter } from '../../types/event'
import { EditorType } from '../../types/editor'
import { TabInfo } from '../../types/ui'
import { cls } from '../../utils/dom'
import { html } from '../vdom/template'
import { Component } from '../vdom/component'
import { Tabs } from './tabs'

interface Props {
    editorType: EditorType
    eventEmitter: Emitter
    /** disables the tabs, as changing the mode converts the text */
    readonly: boolean
}

interface State {
    hide: boolean
}

export class Switch extends Component<Props, State> {
    private tabs: TabInfo[] = [
        { name: 'markdown', text: 'Markdown' },
        { name: 'wysiwyg', text: 'WYSIWYG' }
    ]

    constructor(props: Props) {
        super(props)
        this.state = {
            hide: false
        }
    }

    show() {
        this.setState({ hide: false })
    }

    hide() {
        this.setState({ hide: true })
    }

    private changeMode = (_: MouseEvent | KeyboardEvent, mode: string) => {
        if (mode !== this.props.editorType) {
            this.props.eventEmitter.emit('needChangeMode', mode)
        }
    }

    render() {
        return html`
            <div class="${cls('mode-switch')}" style="display: ${this.state.hide ? 'none' : 'block'}">
                <${Tabs}
                    tabs=${this.tabs}
                    activeTab=${this.props.editorType}
                    disabled=${this.props.readonly}
                    onClick=${this.changeMode}
                />
            </div>
        `
    }
}
