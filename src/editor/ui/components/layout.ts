import { EditorType, PreviewStyle, ToolbarStyle } from '../../types/editor'
import { Emitter } from '../../types/event'
import { IndexList, ToolbarItem, ToolbarItemOptions } from '../../types/ui'
import { cls } from '../../utils/dom'
import { html } from '../vdom/template'
import { Component } from '../vdom/component'
import { Switch } from './switch'
import { Toolbar } from './toolbar/toolbar'
import { ContextMenu } from './context-menu'

interface Props {
    eventEmitter: Emitter
    hideModeSwitch: boolean
    slots: {
        mdEditor: HTMLElement
        mdPreview: HTMLElement
        wwEditor: HTMLElement
    }
    previewStyle: PreviewStyle
    editorType: EditorType
    toolbarStyle: ToolbarStyle
    toolbarItems: ToolbarItem[]
    theme: string
    readonly: boolean
}

interface State {
    editorType: EditorType
    previewStyle: PreviewStyle
    hide: boolean
    theme: string
    readonly: boolean
}

export class Layout extends Component<Props, State> {
    private toolbar!: Toolbar

    constructor(props: Props) {
        super(props)
        const { editorType, previewStyle, theme, readonly } = props

        this.state = {
            editorType,
            previewStyle,
            hide: false,
            theme,
            readonly
        }
        this.addEvent()
    }

    mounted() {
        const { wwEditor, mdEditor, mdPreview } = this.props.slots

        this.refs.wwContainer.appendChild(wwEditor)
        this.refs.mdContainer.insertAdjacentElement('afterbegin', mdEditor)
        this.refs.mdContainer.appendChild(mdPreview)
    }

    insertToolbarItem(indexList: IndexList, item: string | ToolbarItemOptions) {
        this.toolbar.insertToolbarItem(indexList, item)
    }

    removeToolbarItem(name: string) {
        this.toolbar.removeToolbarItem(name)
    }

    render() {
        const { eventEmitter, hideModeSwitch, toolbarItems, toolbarStyle } = this.props
        const { hide, previewStyle, editorType, theme, readonly } = this.state
        const displayClassName = hide ? ' hidden' : ''
        const readonlyClassName = readonly ? ` ${cls('readonly')}` : ''
        const editorTypeClassName = cls(editorType === 'markdown' ? 'md-mode' : 'ww-mode')
        const previewClassName = `${cls('md')}-${previewStyle}-style`
        const themeClassName = cls([theme !== 'light', `${theme} `])

        return html`
            <div
                class="${themeClassName}${cls('default-ui')}${displayClassName}${readonlyClassName}"
                ref=${(el: HTMLElement) => (this.refs.el = el)}
            >
                <${Toolbar}
                    ref=${(toolbar: Toolbar) => (this.toolbar = toolbar)}
                    eventEmitter=${eventEmitter}
                    previewStyle=${previewStyle}
                    toolbarItems=${toolbarItems}
                    editorType=${editorType}
                    toolbarStyle=${toolbarStyle}
                    readonly=${readonly}
                />
                <div
                    class="${cls('main')} ${editorTypeClassName}"
                    ref=${(el: HTMLElement) => (this.refs.editorSection = el)}
                >
                    <div class="${cls('main-container')}">
                        <div
                            class="${cls('md-container')} ${previewClassName}"
                            ref=${(el: HTMLElement) => (this.refs.mdContainer = el)}
                        >
                            <div class="${cls('md-splitter')}"></div>
                        </div>
                        <div
                            class="${cls('ww-container')}"
                            ref=${(el: HTMLElement) => (this.refs.wwContainer = el)}
                        />
                    </div>
                </div>
                ${!hideModeSwitch &&
                html`<${Switch} eventEmitter=${eventEmitter} editorType=${editorType} readonly=${readonly} />`}
                <${ContextMenu} eventEmitter=${eventEmitter} />
            </div>
        `
    }

    addEvent() {
        const { eventEmitter } = this.props

        eventEmitter.listen('hide', this.hide)
        eventEmitter.listen('show', this.show)
        eventEmitter.listen('changeMode', this.changeMode)
        eventEmitter.listen('changePreviewStyle', this.changePreviewStyle)
        eventEmitter.listen('changeTheme', this.changeTheme)
        eventEmitter.listen('changeReadonly', this.changeReadonly)
    }

    private changeReadonly = (readonly: boolean) => {
        if (readonly !== this.state.readonly) {
            this.setState({ readonly })
        }
    }

    private changeTheme = (theme: string) => {
        if (theme !== this.state.theme) {
            this.setState({ theme })
        }
    }

    private changeMode = (editorType: EditorType) => {
        if (editorType !== this.state.editorType) {
            this.setState({ editorType })
        }
    }

    private changePreviewStyle = (previewStyle: PreviewStyle) => {
        if (previewStyle !== this.state.previewStyle) {
            this.setState({ previewStyle })
        }
    }

    private hide = () => {
        this.setState({ hide: true })
    }

    private show = () => {
        this.setState({ hide: false })
    }
}
