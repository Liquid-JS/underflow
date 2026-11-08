import { EditorType, PreviewStyle, ToolbarStyle } from '../../../types/editor'
import { Emitter } from '../../../types/event'
import {
    IndexList,
    PopupInfo,
    TabInfo,
    ToolbarGroupInfo,
    ToolbarItem,
    ToolbarItemOptions
} from '../../../types/ui'
import { html } from '../../vdom/template'
import { Component } from '../../vdom/component'
import {
    createElementWith,
    getOuterWidth,
    closest,
    getTotalOffset,
    cls,
    removeNode,
    isVisible
} from '../../../utils/dom'
import { last } from '../../../utils/common'
import {
    createToolbarItemInfo,
    toggleScrollSync,
    groupToolbarItems,
    setGroupState,
    createPopupInfo
} from '../../toolbar-item-factory'
import { I18n } from '../../../i18n/i18n'
import { css, forEachArray, throttle } from '../../../utils/native'
import { Popup } from '../popup'
import { Tabs } from '../tabs'
import { ToolbarGroup } from './toolbar-group'
import { DropdownToolbarButton } from './dropdown-toolbar-button'

type TabType = 'write' | 'preview'

interface Props {
    eventEmitter: Emitter
    /** the editor's texts, in its language */
    i18n: I18n
    previewStyle: PreviewStyle
    toolbarItems: ToolbarItem[]
    editorType: EditorType
    toolbarStyle: ToolbarStyle
    /** disables the toolbar's items, but not the Write and Preview tabs */
    readonly: boolean
    /** disables the Write and Preview tabs too, and the scroll sync switch, and takes them out of the Tab order */
    disabled: boolean
}

interface State {
    showPopup: boolean
    popupInfo: PopupInfo
    activeTab: TabType
    items: ToolbarGroupInfo[]
    dropdownItems: ToolbarGroupInfo[]
}

interface ItemWidthMap {
    [key: string]: number
}

const INLINE_PADDING = 50

let toolbarCount = 0

export class Toolbar extends Component<Props, State> {
    private tabs: TabInfo[]

    /** each toolbar's own, so the active buttons of several editors are described in their own language */
    private activeDescId = `${cls('active-button-desc')}-${(toolbarCount += 1)}`

    private itemWidthMap: ItemWidthMap

    private tooltipRef!: { current: HTMLElement | null }

    private initialItems: ToolbarGroupInfo[]

    private resizeObserver!: ResizeObserver

    private handleResize!: () => void

    constructor(props: Props) {
        super(props)
        this.tabs = [
            { name: 'write', text: 'Write' },
            { name: 'preview', text: 'Preview' }
        ]
        this.itemWidthMap = {}
        this.initialItems = groupToolbarItems(props.toolbarItems || [], this.hiddenScrollSync(), props.i18n)

        this.state = {
            items: this.initialItems,
            dropdownItems: [],
            showPopup: false,
            popupInfo: {} as PopupInfo,
            activeTab: 'write'
        }
        this.tooltipRef = { current: null }
        this.resizeObserver = new ResizeObserver(() =>
            props.toolbarStyle === 'wrap' ? this.hideWrappedDividers() : this.handleResize()
        )
        this.addEvent()
    }

    insertToolbarItem(indexList: IndexList, item: string | ToolbarItemOptions) {
        const { groupIndex, itemIndex } = indexList
        const group = this.initialItems[groupIndex]

        item = createToolbarItemInfo(item, this.props.i18n)

        if (!item) {
            return
        }

        if (group) {
            group.splice(itemIndex, 0, item)
        } else {
            this.initialItems.push([item])
        }
        this.setState(this.classifyToolbarItems())
    }

    removeToolbarItem(name: string) {
        forEachArray(this.initialItems, (group) => {
            let found = false

            forEachArray(group, (item, index) => {
                if (item.name === name) {
                    found = true
                    group.splice(index, 1)
                    this.setState(this.classifyToolbarItems())
                    return false
                }
                return true
            })
            return !found
        })
    }

    addEvent() {
        const { eventEmitter } = this.props

        this.handleResize = throttle(() => {
            // reset toolbar items to re-layout toolbar items with each clientWidth
            this.setState({ items: this.initialItems, dropdownItems: [] })
            this.setState(this.classifyToolbarItems())
        }, 200)
        eventEmitter.listen('openPopup', this.openPopup)
    }

    private appendTooltipToRoot() {
        const tooltip = `<div class="${cls('tooltip')}" style="display:none">
        <div class="arrow"></div>
        <span class="text"></span>
      </div>`

        this.tooltipRef.current = createElementWith(tooltip, this.refs.el) as HTMLElement
    }

    private hiddenScrollSync() {
        return this.props.editorType === 'wysiwyg' || this.props.previewStyle === 'tab'
    }

    private toggleTab = (_: MouseEvent | KeyboardEvent, activeTab: TabType) => {
        const { eventEmitter } = this.props

        if (this.state.activeTab !== activeTab) {
            const event = activeTab === 'write' ? 'changePreviewTabWrite' : 'changePreviewTabPreview'

            eventEmitter.emit(event)
            this.setState({ activeTab })
        }
    }

    private setItemWidth = (name: string, width: number) => {
        this.itemWidthMap[name] = width
    }

    private setPopupInfo = (popupInfo: PopupInfo) => {
        this.setState({ showPopup: true, popupInfo })
    }

    private openPopup = (popupName: string, initialValues = {}) => {
        const el = this.refs.el.querySelector<HTMLElement>(`.${cls('toolbar-group')} .${popupName}`)!

        // the popups edit the text
        if (el && !this.props.readonly) {
            const { offsetLeft, offsetTop } = getTotalOffset(
                el,
                closest(el, `.${cls('toolbar')}`) as HTMLElement
            )
            const info = createPopupInfo(popupName, {
                el,
                pos: { left: offsetLeft, top: el.offsetHeight + offsetTop },
                initialValues
            })

            if (info) {
                this.setPopupInfo(info)
            }
        }
    }

    private hidePopup = () => {
        if (this.state.showPopup) {
            this.setState({ showPopup: false })
        }
    }

    private execCommand = (command: string, payload?: Record<string, any>) => {
        const { eventEmitter } = this.props

        eventEmitter.emit('command', command, payload)
        this.hidePopup()
    }

    private handleKeyDown = (ev: KeyboardEvent) => {
        const { key } = ev
        const target = document.activeElement as HTMLInputElement | null

        if (key === 'Escape') {
            // tooltips shown on hover or focus have to be dismissable (WCAG 1.4.13)
            this.hideTooltip()
        } else if (target && this.refs.el.contains(target)) {
            // role=toolbar: arrow keys move between the items, Tab leaves the toolbar
            if (
                (key === 'ArrowLeft' || key === 'ArrowRight') &&
        (target.tagName === 'BUTTON' || target.type === 'checkbox')
            ) {
                this.handleArrowKey(key)
                ev.preventDefault()
            } else if (key === 'Tab' && this.handleTabKey(ev.shiftKey)) {
                ev.preventDefault()
            }
        }
    }

    private handleArrowKey(key: string) {
        const focusables = Array.from(
            this.refs.el.querySelectorAll<HTMLElement>('button:not([disabled]), input')
        ).filter((el) => isVisible(el) || el === document.activeElement)
        const focusIndex = focusables.indexOf(document.activeElement as HTMLElement)

        if (key === 'ArrowLeft' && focusIndex > 0) {
            focusables[focusIndex - 1].focus()
        } else if (key === 'ArrowRight' && focusIndex < focusables.length - 1) {
            focusables[focusIndex + 1].focus()
        }
    }

    private handleTabKey(shiftKey: boolean) {
        const focusables = Array.from(
            document.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex], [contenteditable="true"]'
            )
        ).filter((el) => el.getAttribute('tabindex') !== '-1')
        const step = shiftKey ? -1 : 1

        for (
            let index = focusables.indexOf(document.activeElement as HTMLElement) + step;
            index >= 0 && index < focusables.length;
            index += step
        ) {
            const el = focusables[index]

            if (!this.refs.el.contains(el) && isVisible(el)) {
                el.focus()
                return true
            }
        }

        return false
    }

    private hideTooltip = () => {
        if (this.tooltipRef.current) {
            css(this.tooltipRef.current, { display: 'none' })
        }
    }

    private movePrevItemToDropdownToolbar(
        itemIndex: number,
        items: ToolbarGroupInfo[],
        group: ToolbarGroupInfo,
        dropdownGroup: ToolbarGroupInfo
    ) {
        const moveItem = (targetGroup: ToolbarGroupInfo) => {
            const item = targetGroup.pop()

            if (item) {
                dropdownGroup.push(item)
            }
        }

        if (itemIndex > 1) {
            moveItem(group)
        } else {
            const prevGroup = last(items)

            if (prevGroup) {
                moveItem(prevGroup)
            }
        }
    }

    /**
     * Hides the dividers of a wrapping toolbar that end or start a row, where they divide nothing. They keep their
     * space, so the rows don't change.
     */
    private hideWrappedDividers() {
        const items = Array.from(this.refs.el.querySelectorAll<HTMLElement>(`.${cls('toolbar-group')} > *`)).filter(
            (item) => item.getClientRects().length > 0
        )
        const middle = (item?: HTMLElement) => {
            const box = item?.getBoundingClientRect()

            return box ? (box.top + box.bottom) / 2 : NaN
        }

        items.forEach((item, index) => {
            if (item.classList.contains(cls('toolbar-divider'))) {
                const row = middle(item)
                const inRow = (other?: HTMLElement) => Math.abs(middle(other) - row) < item.offsetHeight

                item.style.visibility = inRow(items[index - 1]) && inRow(items[index + 1]) ? '' : 'hidden'
            }
        })
    }

    private classifyToolbarItems() {
        let totalWidth = 0
        const { clientWidth } = this.refs.el
        const divider = this.refs.el.querySelector<HTMLElement>(`.${cls('toolbar-divider')}`)
        const dividerWidth = divider ? getOuterWidth(divider) : 0
        const items: ToolbarGroupInfo[] = []
        const dropdownItems: ToolbarGroupInfo[] = []
        // a wrapping toolbar never moves items to the "More" dropdown
        const wrap = this.props.toolbarStyle === 'wrap'
        let moved = false

        this.initialItems.forEach((initialGroup, groupIndex) => {
            const group: ToolbarGroupInfo = []
            const dropdownGroup: ToolbarGroupInfo = []

            initialGroup.forEach((item, itemIndex) => {
                if (!item.hidden) {
                    totalWidth += this.itemWidthMap[item.name]

                    if (!wrap && totalWidth > clientWidth - INLINE_PADDING) {
                        // should move the prev item to dropdown toolbar for placing the more button
                        if (!moved) {
                            this.movePrevItemToDropdownToolbar(itemIndex, items, group, dropdownGroup)
                            moved = true
                        }
                        dropdownGroup.push(item)
                    } else {
                        group.push(item)
                    }
                }
            })

            if (group.length) {
                setGroupState(group)
                items.push(group)
            }
            if (dropdownGroup.length) {
                setGroupState(dropdownGroup)
                dropdownItems.push(dropdownGroup)
            }
            // add divider width
            if (groupIndex < this.state.items.length - 1) {
                totalWidth += dividerWidth
            }
        })

        return { items, dropdownItems }
    }

    mounted() {
        if (this.props.previewStyle === 'tab') {
            this.props.eventEmitter.emit('changePreviewTabWrite', true)
        }
        // classify toolbar and dropdown toolbar after DOM has been rendered
        this.setState(this.classifyToolbarItems())
        this.appendTooltipToRoot()
        this.disableScrollSync()

        // a wrapping toolbar only rearranges its dividers when its rows change
        this.resizeObserver.observe(this.refs.el)

        document.addEventListener('keydown', this.handleKeyDown)
    }

    updated(prevProps: Props) {
        const { editorType, previewStyle, eventEmitter } = this.props
        const changedStyle = previewStyle !== prevProps.previewStyle
        const changedType = editorType !== prevProps.editorType

        if (changedStyle || changedType) {
            // show or hide scrollSync button
            toggleScrollSync(this.initialItems, this.hiddenScrollSync())
            const newState = this.classifyToolbarItems() as State

            if (changedStyle || (previewStyle === 'tab' && editorType === 'markdown')) {
                eventEmitter.emit('changePreviewTabWrite')
                newState.activeTab = 'write'
            }
            this.setState(newState)
        }
        if (this.props.toolbarStyle === 'wrap') {
            this.hideWrappedDividers()
        }
        if (this.props.disabled !== prevProps.disabled) {
            this.disableScrollSync()
        }
    }

    /** The scroll sync switch is only for reading, so it works in a read-only editor, but not in a disabled one. */
    private disableScrollSync() {
        this.refs.el.querySelectorAll<HTMLInputElement>('.scroll-sync input').forEach((input) => {
            input.disabled = this.props.disabled
        })
    }

    beforeDestroy() {
        window.removeEventListener('resize', this.handleResize)
        this.resizeObserver.disconnect()
        removeNode(this.tooltipRef.current!)
        document.removeEventListener('keydown', this.handleKeyDown)
    }

    get cssClass() {
        const { toolbarStyle, editorType, previewStyle } = this.props
        // the Write and Preview tabs show in the markdown mode with the preview in a tab
        const tabs = editorType === 'markdown' && previewStyle === 'tab'

        return [cls('toolbar'), toolbarStyle === 'wrap' && 'wrap', tabs && 'with-tabs']
            .filter(Boolean)
            .join(' ')
    }

    render() {
        const { previewStyle, eventEmitter, editorType, readonly, disabled } = this.props
        const { popupInfo, showPopup, activeTab, items, dropdownItems } = this.state
        const props = {
            eventEmitter,
            tooltipRef: this.tooltipRef,
            disabled: readonly || (editorType === 'markdown' && previewStyle === 'tab' && activeTab === 'preview'),
            execCommand: this.execCommand,
            setPopupInfo: this.setPopupInfo,
            activeDescId: this.activeDescId
        }

        // The Write and Preview tabs come after the toolbar, at the end of its last row, next to the text they switch.
        return html`
            <div class="${this.cssClass}" onMouseleave=${this.hideTooltip}>
                <div
                    class="${cls('default-ui-toolbar')}"
                    ref=${(el: HTMLElement) => (this.refs.el = el)}
                    role="toolbar"
                    aria-label="${this.props.i18n.get('Text Formatting')}"
                >
                    ${items.map(
                        (group, index) => html`
                            <${ToolbarGroup}
                                group=${group}
                                hiddenDivider=${index === items.length - 1 || items[index + 1]?.hidden}
                                setItemWidth=${this.setItemWidth}
                                ...${props}
                            />
                        `
                    )}
                    <${DropdownToolbarButton}
                        item=${createToolbarItemInfo('more', this.props.i18n)}
                        items=${dropdownItems}
                        ...${props}
                    />
                </div>
                <div
                    class="${cls('md-tab-container')}"
                    style="display: ${editorType === 'wysiwyg' || previewStyle === 'vertical'
                        ? 'none'
                        : 'block'}"
                >
                    <${Tabs}
                        tabs=${this.tabs.map(({ name, text }) => ({ name, text: this.props.i18n.get(text) }))}
                        activeTab=${activeTab}
                        disabled=${disabled}
                        tabbable=${!disabled}
                        onClick=${this.toggleTab}
                    />
                </div>
                <${Popup}
                    info=${popupInfo}
                    show=${showPopup}
                    eventEmitter=${eventEmitter}
                    i18n=${this.props.i18n}
                    hidePopup=${this.hidePopup}
                    execCommand=${this.execCommand}
                />
                <div id=${this.activeDescId} class=${cls('active-button-desc')}>${this.props.i18n.get('Active Button')}</div>
            </div>
        `
    }
}
