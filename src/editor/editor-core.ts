import { DOMParser, DOMSerializer } from 'prosemirror-model'

import { CodeMdNode, Pos as MdPos } from '../parser/types/node'
import { MarkdownDocument } from '../parser/markdown-document'
import { Emitter, EventName, Handler } from './types/event'
import {
    Base,
    EditorOptions,
    EditorPos,
    EditorType,
    PreviewStyle,
    Slots,
    ViewerOptions,
    WidgetStyle
} from './types/editor'
import { PluginCommandMap, PluginInfoResult, CommandFn } from './types/plugin'
import { ToolbarStateMap } from './types/ui'
import { css, forEachOwnProperties, isNumber, isString } from './utils/native'
import { sanitizeLinkAttribute, deepMergedCopy } from './utils/common'

import { MdEditor } from './markdown/md-editor'
import { MarkdownPreview } from './markdown/md-preview'

import { WysiwygEditor } from './wysiwyg/ww-editor'

import { EventEmitter } from './event/event-emitter'
import { CommandManager } from './commands/command-manager'
import { Convertor } from './convertors/convertor'
import { Viewer } from './viewer'
import { i18n, I18n } from './i18n/i18n'
import { getPluginInfo } from './helper/plugin'

import { WwToDOMAdaptor } from './wysiwyg/adaptor/ww-to-dom-adaptor'
import { ScrollSync } from './markdown/scroll/scroll-sync'
import { addDefaultImageBlobHook } from './helper/image'
import { WidgetRules } from './widget/rules'
import { cls, removeProseMirrorHackNodes, replaceBRWithEmptyBlock } from './utils/dom'
import { sanitizeHTML } from './sanitizer/html-sanitizer'
import { createHTMLSchemaMap } from './wysiwyg/nodes/html'
import { getHTMLRenderConvertors } from './markdown/html-render-convertors'
import { buildQuery } from './queries/query-manager'
import { getEditorToMdPos, getMdToEditorPos } from './markdown/helper/pos'
import { getToolbarState } from './wysiwyg/plugins/toolbar-state'
import { getCursorInfo } from './markdown/plugins/preview-highlight'
import { splitTableCellSpans } from './wysiwyg/helper/table-spans'

const reHTMLSource = /<(div|code) data-html-source="true">([\s\S]*?)<\/\1>/g

/** Replaces the HTML that WYSIWYG shows as its source with the HTML itself, sanitized. */
function renderHTMLSource(html: string) {
    if (!html.includes('data-html-source')) {
        return html
    }

    const decoder = document.createElement('textarea')

    return sanitizeHTML(
        html.replace(reHTMLSource, (_, __, source: string) => {
            decoder.innerHTML = source

            return decoder.value
        })
    )
}
/** The editor without the default UI: it creates the editors and the preview for the application to place. */
class EditorCore {
    private initialHTML: string

    private markdownDocument: MarkdownDocument

    private mdEditor: MdEditor

    private wwEditor: WysiwygEditor

    private preview: MarkdownPreview

    private convertor: Convertor

    private commandManager: CommandManager

    private height!: string

    private minHeight!: string

    private mode!: EditorType

    private mdPreviewStyle: PreviewStyle

    /** the texts in the editor's language */
    protected i18n: I18n

    private scrollSync: ScrollSync

    private placeholder?: string

    eventEmitter: Emitter

    protected options: Required<EditorOptions>

    /** @internal */
    protected pluginInfo: PluginInfoResult

    constructor(options: EditorOptions) {
        this.initialHTML = options.el.innerHTML
        options.el.innerHTML = ''

        this.options = {
            previewStyle: 'tab',
            previewHighlight: true,
            cursorLineHighlight: true,
            initialEditType: 'markdown',
            height: '300px',
            minHeight: '200px',
            language: 'en-US',
            useCommandShortcut: true,
            toolbarItems: [
                ['heading', 'bold', 'italic', 'strike'],
                ['hr', 'quote'],
                ['ul', 'ol', 'task', 'indent', 'outdent'],
                ['table', 'image', 'link'],
                ['code', 'codeblock'],
                ['scrollSync']
            ],
            hideModeSwitch: false,
            linkAttributes: null,
            extendedAutolinks: false,
            customHTMLRenderer: null,
            customMarkdownRenderer: null,
            referenceDefinition: false,
            customHTMLSanitizer: null,
            frontMatter: false,
            widgetRules: [],
            theme: 'light',
            autofocus: true,
            stripPastedStyles: false,
            toolbarStyle: 'default',
            readonly: false,
            disabled: false,
            ...options
        } as Required<EditorOptions>

        const {
            customHTMLRenderer,
            extendedAutolinks,
            referenceDefinition,
            frontMatter,
            customMarkdownRenderer,
            useCommandShortcut,
            initialEditType,
            widgetRules,
            customHTMLSanitizer
        } = this.options

        this.mode = initialEditType || 'markdown'
        this.mdPreviewStyle = this.options.previewStyle

        // the editor's own language, which other editors don't change
        this.i18n = i18n.withCode(this.options.language)

        this.eventEmitter = new EventEmitter()

        const rules = new WidgetRules(widgetRules)

        const linkAttributes = sanitizeLinkAttribute(this.options.linkAttributes)

        this.pluginInfo = getPluginInfo({
            plugins: this.options.plugins,
            eventEmitter: this.eventEmitter,
            instance: this,
            i18n: this.i18n
        })
        const {
            toHTMLRenderers,
            toMarkdownRenderers,
            mdPlugins,
            wwPlugins,
            wwNodeViews,
            mdCommands,
            wwCommands,
            markdownParsers
        } = this.pluginInfo
        const rendererOptions = {
            linkAttributes,
            customHTMLRenderer: deepMergedCopy(toHTMLRenderers, customHTMLRenderer),
            extendedAutolinks,
            referenceDefinition,
            frontMatter,
            sanitizer: customHTMLSanitizer || sanitizeHTML
        }
        const wwToDOMAdaptor = new WwToDOMAdaptor(linkAttributes, rendererOptions.customHTMLRenderer)
        const htmlSchemaMap = createHTMLSchemaMap(
            rendererOptions.customHTMLRenderer,
            rendererOptions.sanitizer,
            wwToDOMAdaptor
        )

        this.markdownDocument = new MarkdownDocument('', {
            disallowedHtmlBlockTags: ['br', 'img'],
            extendedAutolinks,
            referenceDefinition,
            frontMatter,
            customParser: markdownParsers,
            widgetRules: rules.patterns
        })

        this.mdEditor = new MdEditor(this.eventEmitter, {
            markdownDocument: this.markdownDocument,
            useCommandShortcut,
            mdPlugins,
            cursorLineHighlight: this.options.cursorLineHighlight,
            autoDirection: this.options.autoDirection,
            widgetRules: rules
        })

        this.preview = new MarkdownPreview(this.eventEmitter, {
            ...rendererOptions,
            isViewer: false,
            highlight: this.options.previewHighlight,
            widgetRules: rules,
            i18n: this.i18n,
            autoDirection: this.options.autoDirection
        })

        this.wwEditor = new WysiwygEditor(this.eventEmitter, {
            toDOMAdaptor: wwToDOMAdaptor,
            useCommandShortcut,
            htmlSchemaMap,
            linkAttributes,
            wwPlugins,
            wwNodeViews,
            stripPastedStyles: this.options.stripPastedStyles,
            editPanel: this.options.editPanel,
            widgetRules: rules,
            i18n: this.i18n,
            autoDirection: this.options.autoDirection
        })

        this.mdEditor.view.dom.setAttribute('aria-label', this.i18n.get('Markdown'))
        this.wwEditor.view.dom.setAttribute('aria-label', this.i18n.get('WYSIWYG'))

        this.convertor = new Convertor(
            this.wwEditor.getSchema(),
            { ...toMarkdownRenderers, ...customMarkdownRenderer },
            getHTMLRenderConvertors(linkAttributes, rendererOptions.customHTMLRenderer, rules),
            this.eventEmitter
        )

        this.setMinHeight(this.options.minHeight)

        this.setHeight(this.options.height)

        // the initial content is not added to the history, so that it can't be undone
        this.setMarkdownContent(this.options.initialValue || '', false, true, false)

        if (this.options.placeholder) {
            this.setPlaceholder(this.options.placeholder)
        }

        if (!this.options.initialValue) {
            this.setHTMLContent(this.initialHTML || '', false, true, false)
        }

        if (this.options.readonly || this.options.disabled) {
            this.applyReadonly()
        }

        this.commandManager = new CommandManager(
            this.eventEmitter,
            this.mdEditor.commands,
            this.wwEditor.commands,
            () => this.mode
        )

        this.scrollSync = new ScrollSync(this.mdEditor, this.preview, this.eventEmitter)
        this.addInitEvent()
        this.addInitCommand(mdCommands, wwCommands)
        buildQuery(this)

        if (this.options.hooks) {
            forEachOwnProperties(this.options.hooks, (fn, key) => this.addHook(key, fn))
        }

        if (this.options.events) {
            forEachOwnProperties(this.options.events, (fn, key) => this.on(key, fn))
        }

        this.eventEmitter.emit('load', this)
        this.moveCursorToStart(false)

        // the editor's elements are mounted after the constructor (by Editor, or by the application with
        // EditorCore), so it's focused once they are, unless it's destroyed by then
        if (this.options.autofocus) {
            queueMicrotask(() => {
                if (this.getCurrentModeEditor().view) {
                    this.focus()
                }
            })
        }
    }

    private addInitEvent() {
        this.on('needChangeMode', this.changeMode.bind(this))
        this.on('loadUI', () => {
            if (this.height !== 'auto') {
                // 75px equals default editor ui height - the editing area height
                const minHeight = `${Math.min(
                    parseInt(this.minHeight, 10),
                    parseInt(this.height, 10) - 75
                )}px`

                this.setMinHeight(minHeight)
            }
        })
        addDefaultImageBlobHook(this.eventEmitter)
    }

    private addInitCommand(mdCommands: PluginCommandMap, wwCommands: PluginCommandMap) {
        const addPluginCommands = (type: EditorType, commandMap: PluginCommandMap) => {
            Object.keys(commandMap).forEach((name) => {
                this.addCommand(type, name, commandMap[name])
            })
        }

        this.addCommand('markdown', 'toggleScrollSync', (payload) => {
            this.eventEmitter.emit('toggleScrollSync', payload!.active)
            return true
        })
        addPluginCommands('markdown', mdCommands)
        addPluginCommands('wysiwyg', wwCommands)
    }

    private getCurrentModeEditor() {
        return (this.isMarkdownMode() ? this.mdEditor : this.wwEditor) as Base
    }

    /** Creates a Viewer with `options.viewer`, an EditorCore otherwise. */
    static factory(options: (EditorOptions | ViewerOptions) & { viewer?: boolean }) {
        return options.viewer ? new Viewer(options) : new EditorCore(options as EditorOptions)
    }

    /** Registers the UI texts of a language under its codes. */
    static setLanguage(code: string | string[], data: Record<string, string>) {
        i18n.setLanguage(code, data)
    }

    /** `light`, `dark` or a custom theme, styled through the `uf-{theme}` class */
    setTheme(theme: string) {
        if (this.options.theme !== theme) {
            this.options.theme = theme
            this.eventEmitter.emit('changeTheme', theme)
        }
    }

    /**
     * Stops the user from changing the text, or lets them again. A read-only editor's text can still be
     * focused, read, selected and copied, as a read-only field's, and the Write and Preview tabs still switch;
     * its toolbar and the mode switch are disabled. The API, e.g. `setMarkdown()`, still changes the text.
     */
    setReadonly(readonly: boolean) {
        if (this.options.readonly !== readonly) {
            this.options.readonly = readonly
            this.applyReadonly()
        }
    }

    isReadonly() {
        return this.options.readonly
    }

    /**
     * Disables the editor, or enables it again. A disabled editor is read-only, see `setReadonly()`, in the disabled
     * colour, and out of the Tab order, as a disabled field: its text, the preview and the tabs too. Its text can
     * still be clicked to select and copy it. The API still changes the text.
     */
    setDisabled(disabled: boolean) {
        if (this.options.disabled !== disabled) {
            this.options.disabled = disabled
            this.applyReadonly()
        }
    }

    isDisabled() {
        return this.options.disabled
    }

    private applyReadonly() {
        const { readonly, disabled } = this.options

        this.mdEditor.setReadonly(readonly)
        this.wwEditor.setReadonly(readonly)
        this.mdEditor.setDisabled(disabled)
        this.wwEditor.setDisabled(disabled)
        if (readonly || disabled) {
            this.eventEmitter.emit('closePopup')
        }
        // whether the user can change the text
        this.eventEmitter.emit('changeReadonly', readonly || disabled)
        this.eventEmitter.emit('changeDisabled', disabled)
    }

    changePreviewStyle(style: PreviewStyle) {
        if (this.mdPreviewStyle !== style) {
            this.mdPreviewStyle = style
            this.eventEmitter.emit('changePreviewStyle', style)
        }
    }

    /** Runs a command in the current mode. */
    exec(name: string, payload?: Record<string, any>) {
        this.commandManager.exec(name, payload)
    }

    addCommand(type: EditorType, name: string, command: CommandFn) {
        const commandHoc = (paylaod: Record<string, any> = {}) => {
            const { view } = type === 'markdown' ? this.mdEditor : this.wwEditor

            command(paylaod, view.state, view.dispatch, view)
        }

        this.commandManager.addCommand(type, name, commandHoc)
    }

    on(type: EventName, handler: Handler) {
        this.eventEmitter.listen(type, handler)
    }

    /** Removes all the handlers of an event. */
    off(type: EventName) {
        this.eventEmitter.removeEventHandler(type)
    }

    /** Replaces the handler of a hook, like `addImageBlobHook`. */
    addHook(type: string, handler: Handler) {
        this.eventEmitter.removeEventHandler(type)
        this.eventEmitter.listen(type, handler)
    }

    removeHook(type: string) {
        this.eventEmitter.removeEventHandler(type)
    }

    focus() {
        this.getCurrentModeEditor().focus()
    }

    blur() {
        this.getCurrentModeEditor().blur()
    }

    moveCursorToEnd(focus = true) {
        this.getCurrentModeEditor().moveCursorToEnd(focus)
    }

    moveCursorToStart(focus = true) {
        this.getCurrentModeEditor().moveCursorToStart(focus)
    }

    /**
     * Moves the cursor to the start of a line (1-based); in WYSIWYG, each text block, table row and code line
     * is a line.
     */
    moveCursorTo(line: number, focus = true) {
        this.getCurrentModeEditor().moveCursorTo(line, focus)
    }

    /** The cursor's line (1-based), counted as in `moveCursorTo()`. */
    getCursorLine() {
        return this.getCurrentModeEditor().getCursorLine()
    }

    getCurrentToolbarState(): ToolbarStateMap {
        if (this.isMarkdownMode()) {
            return getCursorInfo(this.mdEditor.view.state, this.markdownDocument).toolbarState
        }

        const { selection, doc, schema } = this.wwEditor.view.state

        return getToolbarState(selection, doc, schema)
    }

    /** `focus` applies when the cursor moves to the end. */
    setMarkdown(markdown = '', cursorToEnd = true, focus = true) {
        this.setMarkdownContent(markdown, cursorToEnd, focus, true)
    }

    private setMarkdownContent(
        markdown: string,
        cursorToEnd: boolean,
        focus: boolean,
        addToHistory: boolean
    ) {
        this.mdEditor.setMarkdown(markdown, cursorToEnd, focus, addToHistory)

        if (this.isWysiwygMode()) {
            const mdNode = this.markdownDocument.getRootNode()
            const wwNode = this.convertor.toWysiwygModel(mdNode)

            this.wwEditor.setModel(wwNode!, cursorToEnd, focus, addToHistory)
        }
    }

    /** Sets the content from HTML, converted to markdown; `focus` applies when the cursor moves to the end. */
    setHTML(html = '', cursorToEnd = true, focus = true) {
        this.setHTMLContent(html, cursorToEnd, focus, true)
    }

    private setHTMLContent(
        html: string,
        cursorToEnd: boolean,
        focus: boolean,
        addToHistory: boolean
    ) {
        const container = document.createElement('div')

        // the `br` tag should be replaced with empty block to separate between blocks
        container.innerHTML = replaceBRWithEmptyBlock(html)
        splitTableCellSpans(container)
        const wwNode = DOMParser.fromSchema(this.wwEditor.schema).parse(container)

        if (this.isMarkdownMode()) {
            this.mdEditor.setMarkdown(
                this.convertor.toMarkdownText(wwNode),
                cursorToEnd,
                focus,
                addToHistory
            )
        } else {
            this.wwEditor.setModel(wwNode, cursorToEnd, focus, addToHistory)
        }
    }

    getMarkdown() {
        if (this.isMarkdownMode()) {
            return this.mdEditor.getMarkdown()
        }

        return this.convertor.toMarkdownText(this.wwEditor.getModel())
    }

    /** The content as HTML, sanitized, with widgets as they render outside the WYSIWYG editor. */
    getHTML() {
        this.eventEmitter.holdEventInvoke(() => {
            if (this.isMarkdownMode()) {
                const mdNode = this.markdownDocument.getRootNode()
                const wwNode = this.convertor.toWysiwygModel(mdNode)

                this.wwEditor.setModel(wwNode!)
            }
        })
        const { schema, doc } = this.wwEditor.view.state
        const container = document.createElement('div')

        // serialize the document rather than reading the editor's DOM, so node views, decorations and
        // widgets (code block toolbars, highlighting, line numbers, placeholder) stay out of the HTML
        container.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(doc.content))
        // empty text blocks keep a line break, as in the editor, so blank lines keep their height
        container.querySelectorAll('p:empty, h1:empty, h2:empty, h3:empty, h4:empty, h5:empty, h6:empty, td:empty, th:empty')
            .forEach((el) => el.appendChild(document.createElement('br')))

        const html = renderHTMLSource(removeProseMirrorHackNodes(container.innerHTML))

        if (this.placeholder) {
            const rePlaceholder = new RegExp(
                `<span class="placeholder[^>]+>${this.placeholder}</span>`,
                'i'
            )

            return html.replace(rePlaceholder, '')
        }

        return html
    }

    insertText(text: string) {
        this.getCurrentModeEditor().replaceSelection(text)
    }

    setSelection(start: EditorPos, end?: EditorPos) {
        this.getCurrentModeEditor().setSelection(start, end)
    }

    /** Replaces the selection, or the given range, with the text. */
    replaceSelection(text: string, start?: EditorPos, end?: EditorPos) {
        this.getCurrentModeEditor().replaceSelection(text, start, end)
    }

    /** Deletes the selection, or the given range. */
    deleteSelection(start?: EditorPos, end?: EditorPos) {
        this.getCurrentModeEditor().deleteSelection(start, end)
    }

    /** The text of the selection, or of the given range. */
    getSelectedText(start?: EditorPos, end?: EditorPos) {
        return this.getCurrentModeEditor().getSelectedText(start, end)
    }

    /** The range and type of the node at the position, or at the cursor. */
    getRangeInfoOfNode(pos?: EditorPos) {
        return this.getCurrentModeEditor().getRangeInfoOfNode(pos)
    }

    /** Shows an element above or below the cursor, or the given position, like a popup. */
    addWidget(node: Node, style: WidgetStyle, pos?: EditorPos) {
        this.getCurrentModeEditor().addWidget(node, style, pos)
    }

    /** Replaces the range with text that the widget rules show as a widget. */
    replaceWithWidget(start: EditorPos, end: EditorPos, text: string) {
        this.getCurrentModeEditor().replaceWithWidget(start, end, text)
    }

    /** CSS height, toolbar included, e.g. `300px`, `100%` or `auto` */
    setHeight(height: string) {
        const { el } = this.options

        if (isString(height)) {
            if (height === 'auto') {
                el.classList.add('auto-height')
            } else {
                el.classList.remove('auto-height')
            }
            this.setMinHeight(this.getMinHeight())
        }

        css(el, { height })
        this.height = height
    }

    getHeight() {
        return this.height
    }

    /** CSS min-height, e.g. `200px` */
    setMinHeight(minHeight: string) {
        if (minHeight !== this.minHeight) {
            const height = this.height || this.options.height

            if (height !== 'auto' && this.options.el.querySelector(`.${cls('main')}`)) {
                // 75px equals default editor ui height - the editing area height
                minHeight = `${Math.min(parseInt(minHeight, 10), parseInt(height, 10) - 75)}px`
            }

            const minHeightNum = parseInt(minHeight, 10)

            this.minHeight = minHeight

            this.wwEditor.setMinHeight(minHeightNum)
            this.mdEditor.setMinHeight(minHeightNum)
            this.preview.setMinHeight(minHeightNum)
        }
    }

    getMinHeight() {
        return this.minHeight
    }

    isMarkdownMode() {
        return this.mode === 'markdown'
    }

    isWysiwygMode() {
        return this.mode === 'wysiwyg'
    }

    isViewer() {
        return false
    }

    getCurrentPreviewStyle() {
        return this.mdPreviewStyle
    }

    changeMode(mode: EditorType, withoutFocus?: boolean) {
        if (this.mode === mode) {
            return
        }

        this.mode = mode

        if (this.isWysiwygMode()) {
            const mdNode = this.markdownDocument.getRootNode()

            this.setMarkdownCursorText()

            const wwNode = this.convertor.toWysiwygModel(mdNode)

            this.wwEditor.setModel(wwNode!)
        } else {
            const wwNode = this.wwEditor.getModel()

            this.setWysiwygCursorText()
            this.mdEditor.setMarkdown(this.convertor.toMarkdownText(wwNode), !withoutFocus)
        }

        this.eventEmitter.emit('removePopupWidget')
        this.eventEmitter.emit('changeMode', mode)

        if (!withoutFocus) {
            const pos = this.convertor.getMappedPos()

            this.focus()

            if (this.isWysiwygMode() && isNumber(pos)) {
                this.wwEditor.setSelection(pos)
            } else if (Array.isArray(pos)) {
                this.mdEditor.setSelection(pos)
            }
        }
    }

    /** Tells the convertor which text the markdown cursor is in, to keep it there in WYSIWYG. */
    private setMarkdownCursorText() {
        const [[line, ch]] = this.mdEditor.getSelection()
        const textAt = (pos: MdPos) => {
            const found = this.markdownDocument.findNodeAtPosition(pos)

            return found && (found.type === 'text' || found.type === 'code') ? found : null
        }
        // the cursor is in a text node, or right after one
        let node = textAt([line, ch])

        if (!node && ch > 1) {
            const before = textAt([line, ch - 1])

            node = before && before.sourcepos![1][1] === ch - 1 ? before : null
        }

        // the text of inline code starts after its backticks
        const start = node ? node.sourcepos![0][1] + ((node as CodeMdNode).tickCount ?? 0) : 0

        this.convertor.setCursorText(node, Math.max(ch - start, 0))
    }

    /** Tells the convertor which text the WYSIWYG cursor is in, to keep it there in markdown. */
    private setWysiwygCursorText() {
        const { $from } = this.wwEditor.view.state.selection
        const { parent, parentOffset } = $from
        const after = parent.childAfter(parentOffset)
        const before = parent.childBefore(parentOffset)

        // between two texts, the cursor belongs to the one before it, whose marks typing continues
        if (before.node?.isText) {
            this.convertor.setCursorText(before.node, parentOffset - before.offset)
        } else if (after.node?.isText) {
            this.convertor.setCursorText(after.node, parentOffset - after.offset)
        } else {
            this.convertor.setCursorText(null)
        }
    }

    destroy() {
        this.wwEditor.destroy()
        this.mdEditor.destroy()
        this.preview.destroy()
        this.scrollSync.destroy()
        this.eventEmitter.emit('destroy')
        this.eventEmitter.getEvents().forEach((_, type: string) => this.off(type))
    }

    hide() {
        this.eventEmitter.emit('hide')
    }

    show() {
        this.eventEmitter.emit('show')
    }

    /** Scrolls the current mode's editing area. */
    setScrollTop(value: number) {
        this.getCurrentModeEditor().setScrollTop(value)
    }

    getScrollTop() {
        return this.getCurrentModeEditor().getScrollTop()
    }

    /** Clears the content. */
    reset() {
        this.wwEditor.setModel([])
        this.mdEditor.setMarkdown('')
    }

    getSelection() {
        return this.getCurrentModeEditor().getSelection()
    }

    setPlaceholder(placeholder: string) {
        this.placeholder = placeholder
        this.mdEditor.setPlaceholder(placeholder)
        this.wwEditor.setPlaceholder(placeholder)
    }

    /** The elements an application places in the page when it uses EditorCore without the default UI. */
    getEditorElements(): Slots {
        return {
            mdEditor: this.mdEditor.getElement(),
            mdPreview: this.preview.getElement(),
            wwEditor: this.wwEditor.getElement()
        }
    }

    /** Converts a position from one mode's format to the other's. */
    convertPosToMatchEditorMode(start: EditorPos, end = start, mode = this.mode) {
        const { doc } = this.mdEditor.view.state
        const isFromArray = Array.isArray(start)
        const isToArray = Array.isArray(end)

        let convertedFrom = start
        let convertedTo = end

        if (isFromArray !== isToArray) {
            throw new Error('Types of arguments must be same')
        }

        if (mode === 'markdown' && !isFromArray && !isToArray) {
            [convertedFrom, convertedTo] = getEditorToMdPos(doc, start as number, end as number)
        } else if (mode === 'wysiwyg' && isFromArray && isToArray) {
            [convertedFrom, convertedTo] = getMdToEditorPos(doc, start as MdPos, end as MdPos)
        }

        return [convertedFrom, convertedTo]
    }
}

// // (Not an official API)
// // Create a function converting markdown to HTML using the internal parser and renderer.

export { EditorCore }
