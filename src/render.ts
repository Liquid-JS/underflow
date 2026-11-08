import { renderMarkdown, type RenderMarkdownOptions } from './editor/render-markdown'

export type {
    ExtendedAutolinks,
    LinkAttributes,
    Sanitizer,
    WidgetRule,
    PluginContext,
    CustomHTMLRenderer,
    HTMLMdNodeConvertor,
    HTMLMdNodeConvertorMap
} from './editor/types/editor'
export type { PluginInfo } from './editor/types/plugin'
export type { RenderMarkdownOptions }

export { renderMarkdown }
