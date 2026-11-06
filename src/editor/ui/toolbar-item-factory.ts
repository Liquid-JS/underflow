import {
    PopupInfo,
    PopupOptions,
    Pos,
    ToolbarButtonInfo,
    ToolbarGroupInfo,
    ToolbarItem,
    ToolbarItemInfo,
    ToolbarItemOptions,
    PopupInitialValues,
    ToolbarCustomOptions,
    ExecCommand
} from '../types/ui'
import { i18n } from '../i18n/i18n'
import { cls } from '../utils/dom'
import { isMac } from '../utils/common'
import { isString } from '../utils/native'
import { html } from './vdom/template'
import { HeadingPopupBody } from './components/toolbar/heading-popup-body'
import { ImagePopupBody } from './components/toolbar/image-popup-body'
import { LinkPopupBody } from './components/toolbar/link-popup-body'
import { TablePopupBody } from './components/toolbar/table-popup-body'
import { CustomPopupBody } from './components/toolbar/custom-popup-body'
import { icons } from './icons'

export function createToolbarItemInfo(type: string | ToolbarItemOptions): ToolbarItemInfo {
    return isString(type) ? createDefaultToolbarItemInfo(type) : type
}

function createScrollSyncToolbarItem(): ToolbarItemInfo {
    const label = document.createElement('label')
    const checkbox = document.createElement('input')
    const toggleSwitch = document.createElement('span')

    label.className = 'scroll-sync active'
    label.setAttribute('role', 'presentation')

    checkbox.setAttribute('aria-label', i18n.get('Auto scroll enabled'))
    checkbox.type = 'checkbox'
    checkbox.checked = true
    toggleSwitch.className = 'switch'

    const onMounted = (execCommand: ExecCommand) =>
        checkbox.addEventListener('change', (ev: Event) => {
            const { checked } = ev.target as HTMLInputElement

            if (checked) {
                label.classList.add('active')
                checkbox.setAttribute('aria-label', i18n.get('Auto scroll enabled'))
            } else {
                label.classList.remove('active')
                checkbox.setAttribute('aria-label', i18n.get('Auto scroll disabled'))
            }
            execCommand('toggleScrollSync', { active: checked })
        })

    label.appendChild(checkbox)
    label.appendChild(toggleSwitch)

    return {
        name: 'scrollSync',
        el: label,
        onMounted
    }
}

function createDefaultToolbarItemInfo(type: string) {
    let info!: ToolbarButtonInfo | ToolbarCustomOptions

    switch (type) {
        case 'heading':
            info = {
                name: 'heading',
                className: 'heading',
                tooltip: i18n.get('Headings'),
                state: 'heading',
                ariaHasPopup: true
            }
            break
        case 'bold':
            info = {
                name: 'bold',
                className: 'bold',
                command: 'bold',
                tooltip: `${i18n.get('Bold')} (${formatShortcut('Mod-B')})`,
                state: 'strong'
            }
            break
        case 'italic':
            info = {
                name: 'italic',
                className: 'italic',
                command: 'italic',
                tooltip: `${i18n.get('Italic')} (${formatShortcut('Mod-I')})`,
                state: 'emph'
            }
            break
        case 'strike':
            info = {
                name: 'strike',
                className: 'strike',
                command: 'strike',
                tooltip: `${i18n.get('Strike')} (${formatShortcut('Mod-S')})`,
                state: 'strike'
            }
            break
        case 'hr':
            info = {
                name: 'hr',
                className: 'hrline',
                command: 'hr',
                tooltip: `${i18n.get('Line')} (${formatShortcut('Mod-L')})`,
                state: 'thematicBreak'
            }
            break
        case 'quote':
            info = {
                name: 'quote',
                className: 'quote',
                command: 'blockQuote',
                tooltip: `${i18n.get('Blockquote')} (${formatShortcut('Shift-Mod-.')})`,
                state: 'blockQuote'
            }
            break
        case 'ul':
            info = {
                name: 'ul',
                className: 'bullet-list',
                command: 'bulletList',
                tooltip: `${i18n.get('Unordered list')} (${formatShortcut('Mod-U')})`,
                state: 'bulletList'
            }
            break
        case 'ol':
            info = {
                name: 'ol',
                className: 'ordered-list',
                command: 'orderedList',
                tooltip: `${i18n.get('Ordered list')} (${formatShortcut('Mod-O')})`,
                state: 'orderedList'
            }
            break
        case 'task':
            info = {
                name: 'task',
                className: 'task-list',
                command: 'taskList',
                tooltip: `${i18n.get('Task')} (${formatShortcut('Shift-Mod-U')})`,
                state: 'taskList'
            }
            break
        case 'table':
            info = {
                name: 'table',
                className: 'table',
                tooltip: i18n.get('Insert table'),
                state: 'table'
            }
            break

        case 'image':
            info = {
                name: 'image',
                className: 'image',
                tooltip: i18n.get('Insert image')
            }
            break
        case 'link':
            info = {
                name: 'link',
                className: 'link',
                tooltip: i18n.get('Insert link')
            }
            break
        case 'code':
            info = {
                name: 'code',
                className: 'code',
                command: 'code',
                tooltip: `${i18n.get('Code')} (${formatShortcut('Shift-Mod-C')})`,
                state: 'code'
            }
            break
        case 'codeblock':
            info = {
                name: 'codeblock',
                className: 'codeblock',
                command: 'codeBlock',
                tooltip: `${i18n.get('Insert CodeBlock')} (${formatShortcut('Shift-Mod-P')})`,
                state: 'codeBlock'
            }
            break
        case 'indent':
            info = {
                name: 'indent',
                className: 'indent',
                command: 'indent',
                tooltip: i18n.get('Indent'),
                state: 'indent'
            }
            break
        case 'outdent':
            info = {
                name: 'outdent',
                className: 'outdent',
                command: 'outdent',
                tooltip: i18n.get('Outdent'),
                state: 'outdent'
            }
            break
        case 'scrollSync':
            info = createScrollSyncToolbarItem()
            break
        case 'more':
            info = {
                name: 'more',
                className: 'more',
                tooltip: i18n.get('More')
            }
            break

        default:
    // do nothing
    }

    if (info && info.name !== 'scrollSync') {
        const button = info as ToolbarButtonInfo

        button.icon = icons[button.className!]
        button.className += ` ${cls('toolbar-icons')}`
    }

    return info
}

interface Payload {
    el: HTMLElement
    pos: Pos
    popup?: PopupOptions
    initialValues?: PopupInitialValues
}

function formatShortcut(shortcut: string): string {
    return shortcut.replace('Mod', isMac() ? '⌘' : 'Ctrl')
}

export function createPopupInfo(type: string, payload: Payload): PopupInfo | null {
    const { el, pos, popup, initialValues } = payload

    switch (type) {
        case 'heading':
            return {
                render: (props) => html`<${HeadingPopupBody} ...${props} />`,
                className: cls('popup-add-heading'),
                fromEl: el,
                pos
            }
        case 'link':
            return {
                render: (props) => html`<${LinkPopupBody} ...${props} />`,
                className: cls('popup-add-link'),
                fromEl: el,
                pos,
                initialValues
            }
        case 'image':
            return {
                render: (props) => html`<${ImagePopupBody} ...${props} />`,
                className: cls('popup-add-image'),
                fromEl: el,
                pos
            }
        case 'table':
            return {
                render: (props) => html`<${TablePopupBody} ...${props} />`,
                className: cls('popup-add-table'),
                fromEl: el,
                pos
            }
        case 'customPopupBody':
            if (!popup) {
                return null
            }
            return {
                render: (props) => html`<${CustomPopupBody} ...${props} body=${popup!.body} />`,
                fromEl: el,
                pos,
                ...popup!
            }
        default:
            return null
    }
}

export function setGroupState(group: ToolbarGroupInfo) {
    group.hidden = group.length === group.filter((info: ToolbarButtonInfo) => info.hidden).length
}

export function groupToolbarItems(toolbarItems: ToolbarItem[], hiddenScrollSync: boolean) {
    const toggleScrollSyncState = (item: ToolbarButtonInfo) => {
        item.hidden = item.name === 'scrollSync' && hiddenScrollSync
        return item
    }

    return toolbarItems.reduce((acc: ToolbarGroupInfo[], item) => {
        acc.push(
            item
                .map((type) => createToolbarItemInfo(type))
            // ignore toolbar items which can't be created (e.g. unknown item names)
                .filter(Boolean)
                .map(toggleScrollSyncState)
        )
        const group = acc[(acc.length || 1) - 1]

        if (group) {
            setGroupState(group)
        }
        return acc
    }, [])
}

export function toggleScrollSync(toolbarItems: ToolbarGroupInfo[], hiddenScrollSync: boolean) {
    toolbarItems.forEach((group) => {
        group.forEach(
            (item: ToolbarButtonInfo) => (item.hidden = item.name === 'scrollSync' && hiddenScrollSync)
        )
        setGroupState(group)
    })
}
