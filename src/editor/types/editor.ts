import { Schema, NodeSpec, MarkSpec, Fragment } from 'prosemirror-model'
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view'
import { EditorState, Plugin, PluginKey, Selection, TextSelection } from 'prosemirror-state'
import { undoInputRule, InputRule, inputRules } from 'prosemirror-inputrules'
import { keymap } from 'prosemirror-keymap'

import type { EditorCore } from '../editor-core'
import type { Viewer } from '../viewer'
import { HTMLConvertor, Context as MdContext, HTMLToken, HTMLConvertorMap } from '../../parser/types/renderer'
import { Pos as MdPos, Sourcepos } from '../../parser/types/node'
import type { AutolinkParser } from '../../parser/types/parser'
import { Emitter } from './event'
import { Context, EditorAllCommandMap, EditorCommandFn, SpecManager } from './spec'
import { ToMdConvertorMap } from './convertor'
import { ToolbarItemOptions } from './ui'
import { PluginInfo } from './plugin'
import { HTMLMdNode } from './markdown'

export type PreviewStyle = 'tab' | 'vertical'
export type EditorType = 'markdown' | 'wysiwyg'
export type WidgetStyle = 'top' | 'bottom'
/** Where a widget is shown: `interactive` in the WYSIWYG editor, not in the preview, the viewer and getHTML(). */
export interface WidgetContext {
    interactive: boolean
}

/** A part of a widget's text in the markdown editor, by offsets within the matched text. */
export interface WidgetSourcePart {
    from: number
    to: number
    /** class names for the part, e.g. to highlight the user name of a mention */
    className?: string
    /** hide the part while the cursor is outside the widget; it shows as soon as the cursor enters */
    collapsed?: boolean
}

export interface WidgetRule {
    /** the markdown text the widget stands for; matched outside code spans and code blocks */
    rule: RegExp
    /** the widget's DOM in the WYSIWYG editor, the preview, the viewer and getHTML() */
    toDOM: (text: string, context: WidgetContext) => HTMLElement
    /** styles the widget's text in the markdown editor, where it stays editable markdown */
    toSource?: (text: string) => WidgetSourcePart[]
}

export interface WidgetClickEvent {
    text: string
    /** the widget's position in the markdown */
    start: MdPos
    end: MdPos
    event: MouseEvent
}
export type ToolbarStyle = 'default' | 'wrap'

export interface EventMap {
    load?: (param: EditorCore | Viewer) => void
    change?: (editorType: EditorType) => void
    /** the selection moved */
    caretChange?: (editorType: EditorType) => void
    focus?: (editorType: EditorType) => void
    blur?: (editorType: EditorType) => void
    keydown?: (editorType: EditorType, ev: KeyboardEvent) => void
    keyup?: (editorType: EditorType, ev: KeyboardEvent) => void
    /** returns the HTML to show in the preview */
    beforePreviewRender?: (html: string) => string
    /** returns the markdown to use for the WYSIWYG content */
    beforeConvertWysiwygToMarkdown?: (markdownText: string) => string
    /** a widget's text was clicked in the markdown editor */
    clickWidget?: (param: WidgetClickEvent) => void
}

export type HookCallback = (url: string, text?: string) => void

export interface HookMap {
    /** uploads a pasted, dropped or selected image, and passes its URL to the callback */
    addImageBlobHook?: (blob: Blob | File, callback: HookCallback) => void
}

export type { AutolinkParser }

export type ExtendedAutolinks = boolean | AutolinkParser

export type LinkAttributeNames = 'rel' | 'target' | 'hreflang' | 'type'

export type LinkAttributes = Partial<Record<LinkAttributeNames, string>>

export type Sanitizer = (content: string) => string

export type HTMLMdNodeConvertor = (
    node: HTMLMdNode,
    context: MdContext,
    convertors?: HTMLConvertorMap
) => HTMLToken | HTMLToken[] | null

export type HTMLMdNodeConvertorMap = Record<string, HTMLMdNodeConvertor>

export type CustomHTMLRenderer = Partial<Record<string, HTMLConvertor | HTMLMdNodeConvertorMap>>

export interface ViewerOptions {
    el: HTMLElement
    initialValue?: string
    events?: EventMap
    /** plugins, or `[plugin, options]` pairs */
    plugins?: EditorPlugin[]
    /** links URLs written without `<>`, as GFM does, or with a custom parser */
    extendedAutolinks?: ExtendedAutolinks
    /** added to the links rendered from markdown */
    linkAttributes?: LinkAttributes
    customHTMLRenderer?: CustomHTMLRenderer
    /** resolves link reference definitions (`[label]: url`) */
    referenceDefinition?: boolean
    /** replaces the default, DOMPurify-based sanitizer */
    customHTMLSanitizer?: Sanitizer
    /** reads a `---` block at the start as front matter */
    frontMatter?: boolean
    /** `light`, `dark` or a custom theme, see docs/theming.md; `light` by default */
    theme?: string
    /** see docs/widget.md */
    widgetRules?: WidgetRule[]
}

export interface I18n {
    setCode(code?: string): void

    setLanguage(codes: string | string[], data: Record<string, string>): void

    get(key: string, code?: string): string
}

export interface PluginContext {
    eventEmitter: Emitter
    i18n: I18n
    instance: EditorCore | Viewer
    pmState: {
        Plugin: typeof Plugin
        PluginKey: typeof PluginKey
        Selection: typeof Selection
        TextSelection: typeof TextSelection
    }
    pmView: { Decoration: typeof Decoration, DecorationSet: typeof DecorationSet }
    pmModel: { Fragment: typeof Fragment }
    pmRules: {
        inputRules: typeof inputRules
        InputRule: typeof InputRule
        undoInputRule: typeof undoInputRule
    }
    pmKeymap: {
        keymap: typeof keymap
    }
}

export type PluginFn = (context: PluginContext, options?: any) => PluginInfo | null
export type EditorPlugin = PluginFn | [PluginFn, any]
export interface ContextInfo {
    eventEmitter: Emitter
    instance: EditorCore | Viewer
}

export type EditorPluginInfo = ContextInfo & {
    plugin: EditorPlugin
}

export type EditorPluginsInfo = ContextInfo & {
    plugins: EditorPlugin[]
}

export interface EditorOptions {
    el: HTMLElement
    /** CSS height, toolbar included, e.g. `300px`, `100%` or `auto`; `300px` by default */
    height?: string
    /** `200px` by default */
    minHeight?: string
    initialValue?: string
    /** the markdown preview in a tab or next to the editor; `tab` by default */
    previewStyle?: PreviewStyle
    /** `markdown` by default */
    initialEditType?: EditorType
    events?: EventMap
    hooks?: HookMap
    /** the UI language, whose locale must be imported first; `en-US` by default */
    language?: string
    /** `true` by default */
    useCommandShortcut?: boolean
    /** groups of toolbar items, see docs/toolbar.md */
    toolbarItems?: Array<Array<string | ToolbarItemOptions>>
    /** hides the Markdown/WYSIWYG tabs */
    hideModeSwitch?: boolean
    /** plugins, or `[plugin, options]` pairs */
    plugins?: EditorPlugin[]
    /** links URLs written without `<>`, as GFM does, or with a custom parser */
    extendedAutolinks?: ExtendedAutolinks
    placeholder?: string
    /** added to the links rendered from markdown */
    linkAttributes?: LinkAttributes
    customHTMLRenderer?: CustomHTMLRenderer
    customMarkdownRenderer?: ToMdConvertorMap
    /** resolves link reference definitions (`[label]: url`) */
    referenceDefinition?: boolean
    /** replaces the default, DOMPurify-based sanitizer */
    customHTMLSanitizer?: Sanitizer
    /** highlights the preview element at the cursor; `true` by default */
    previewHighlight?: boolean
    /** highlights the cursor line in the markdown editor; `true` by default */
    cursorLineHighlight?: boolean
    /** reads a `---` block at the start as front matter */
    frontMatter?: boolean
    /** see docs/widget.md */
    widgetRules?: WidgetRule[]
    /** `light`, `dark` or a custom theme, see docs/theming.md; `light` by default */
    theme?: string
    /** `true` by default */
    autofocus?: boolean
    /** creates a Viewer instead, with `EditorCore.factory()` */
    viewer?: boolean
    /** removes inline styles from HTML pasted into the WYSIWYG editor */
    stripPastedStyles?: boolean
    editPanel?: EditPanelOptions
    /** `wrap` wraps the toolbar instead of moving the items that don't fit into a "More" menu */
    toolbarStyle?: ToolbarStyle
}

/** panels that edit a clicked link or image, or a hovered table, in the WYSIWYG editor (all on by default) */
export interface EditPanelOptions {
    useLinkEditPanel?: boolean
    useImageEditPanel?: boolean
    useTableEditPanel?: boolean
}

export interface Slots {
    mdEditor: HTMLElement
    mdPreview: HTMLElement
    wwEditor: HTMLElement
}

/** `[[line, ch], [line, ch]]` (1-based) in markdown, `[from, to]` document positions in WYSIWYG */
export type SelectionPos = Sourcepos | [from: number, to: number]
/** `[line, ch]` (1-based) in markdown, a document position in WYSIWYG */
export type EditorPos = MdPos | number
export interface NodeRangeInfo {
    range: SelectionPos
    type: string
}

export interface Base {
    el: HTMLElement

    editorType: EditorType

    eventEmitter: Emitter

    context: Context

    schema: Schema

    keymaps: Plugin[]

    view: EditorView

    commands: EditorAllCommandMap

    specs: SpecManager

    placeholder: { text: string }

    createSpecs(): SpecManager

    createContext(): Context

    createState(): EditorState

    createView(): EditorView

    createSchema(): Schema

    createKeymaps(useCommandShortcut: boolean): Plugin[]

    createCommands(): Record<string, EditorCommandFn<Record<string, any>>>

    focus(): void

    blur(): void

    destroy(): void

    moveCursorToStart(focus: boolean): void

    moveCursorToEnd(focus: boolean): void

    moveCursorTo(line: number, focus?: boolean): void

    getCursorLine(): number

    setScrollTop(top: number): void

    getScrollTop(): number

    setPlaceholder(text: string): void

    setHeight(height: number): void

    setMinHeight(minHeight: number): void

    getElement(): HTMLElement

    setSelection(start: EditorPos, end?: EditorPos): void

    replaceWithWidget(start: EditorPos, end: EditorPos, text: string): void

    addWidget(node: Node, style: WidgetStyle, pos?: EditorPos): void

    replaceSelection(text: string, start?: EditorPos, end?: EditorPos): void

    deleteSelection(start?: EditorPos, end?: EditorPos): void

    getSelectedText(start?: EditorPos, end?: EditorPos): string

    getSelection(): SelectionPos

    getRangeInfoOfNode(pos?: EditorPos): NodeRangeInfo
}

export type SchemaMap = Record<string, NodeSpec | MarkSpec>
export interface HTMLSchemaMap {
    nodes: SchemaMap
    marks: SchemaMap
}
