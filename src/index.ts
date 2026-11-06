import { EditorCore } from './editor/editor-core'
import { Editor } from './editor/editor'
import { Viewer } from './editor/viewer'

export type {
    MdNode,
    MdNodeType,
    ListMdNode,
    ListItemMdNode,
    TableMdNode,
    TableCellMdNode,
    CodeBlockMdNode,
    LinkMdNode,
    ListData,
    HeadingMdNode,
    CodeMdNode
} from './parser/types/node'
export type { HTMLConvertorMap } from './parser/types/renderer'
export type {
    EditorOptions,
    ViewerOptions,
    ExtendedAutolinks,
    LinkAttributes,
    Sanitizer,
    EditorType,
    PreviewStyle,
    EventMap,
    HookMap,
    WidgetStyle,
    WidgetRule,
    WidgetContext,
    WidgetSourcePart,
    WidgetClickEvent,
    PluginContext,
    I18n,
    CustomHTMLRenderer,
    HTMLMdNodeConvertor,
    HTMLMdNodeConvertorMap,
    EditorPlugin,
    SelectionPos,
    EditorPos,
    NodeRangeInfo,
    EditPanelOptions,
    ToolbarStyle,
    Slots,
    AutolinkParser,
    LinkAttributeNames,
    PluginFn,
    HookCallback
} from './editor/types/editor'
export type {
    ToolbarItemOptions,
    ToolbarButtonOptions,
    ToolbarCustomOptions,
    PopupOptions,
    StyleProps,
    IndexList,
    ToolbarStateMap,
    ToolbarItemState,
    CSSPropertyName,
    ExecCommand
} from './editor/types/ui'
export type {
    ToMdConvertorMap,
    ToMdConvertor,
    ToMdConvertorContext,
    ToMdConvertorReturnValues,
    NodeInfo,
    MarkInfo,
    Attrs
} from './editor/types/convertor'
export type { WwNodeType, WwMarkType } from './editor/types/wysiwyg'
export type { Emitter, Handler, EventName, EventTypes } from './editor/types/event'
export type { Dispatch, Payload, DefaultPayload } from './editor/types/spec'
export type {
    PluginInfo,
    PluginNodeViews,
    CommandFn,
    PluginCommandMap,
    PluginProp,
    NodeViewPropMap,
    PluginToolbarItem
} from './editor/types/plugin'
export type { MdLikeNode, HTMLMdNode } from './editor/types/markdown'

export { Editor, EditorCore, Viewer }
