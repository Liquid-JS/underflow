import DOMPurify from 'dompurify'
import { MarkdownDocument } from '../parser/markdown-document'
import { Renderer } from '../parser/html/renderer'
import { EventEmitter } from './event/event-emitter'
import { getPluginInfo } from './helper/plugin'
import { getHTMLRenderConvertors } from './markdown/html-render-convertors'
import { registerHTMLTagToWhitelist, sanitizeHTML } from './sanitizer/html-sanitizer'
import { Sanitizer, ViewerOptions } from './types/editor'
import { sanitizeLinkAttribute } from './utils/common'
import type { Viewer } from './viewer'
import { WidgetRules } from './widget/rules'

export interface RenderMarkdownOptions extends Pick<
    ViewerOptions,
    | 'plugins'
    | 'extendedAutolinks'
    | 'linkAttributes'
    | 'customHTMLRenderer'
    | 'referenceDefinition'
    | 'frontMatter'
    | 'widgetRules'
> {
    /**
     * Cleans the HTML, as the viewer does with DOMPurify by default, which needs a DOM; without one, e.g. on the server,
     * pass a sanitizer, or `null` for markdown you trust, which keeps its HTML as it is.
     */
    sanitizer?: Sanitizer | null
}

/**
 * Renders markdown to HTML as the viewer and the editor's preview show it, with the same options and plugins, but
 * without a viewer, e.g. on the server. Plugins get no editor or viewer instance.
 */
export function renderMarkdown(markdown: string, options: RenderMarkdownOptions = {}) {
    const {
        plugins = [],
        extendedAutolinks = false,
        linkAttributes = null,
        customHTMLRenderer = {},
        referenceDefinition = false,
        frontMatter = false,
        widgetRules = [],
        sanitizer = DOMPurify.isSupported ? sanitizeHTML : undefined
    } = options

    if (sanitizer === undefined) {
        throw new Error('renderMarkdown() needs a DOM to sanitize the HTML: pass a sanitizer, or null for trusted markdown')
    }

    const { toHTMLRenderers, markdownParsers } = getPluginInfo({
        plugins,
        eventEmitter: new EventEmitter(),
        instance: undefined as unknown as Viewer
    })
    const renderers = { ...toHTMLRenderers, ...customHTMLRenderer }
    const rules = new WidgetRules(widgetRules)
    const document = new MarkdownDocument(markdown, {
        disallowedHtmlBlockTags: ['br', 'img'],
        extendedAutolinks,
        referenceDefinition,
        frontMatter,
        customParser: markdownParsers,
        widgetRules: rules.patterns
    })
    // with node ids, as the viewer, whose list items have paragraphs, without the ids
    const renderer = new Renderer({
        gfm: true,
        nodeId: true,
        convertors: getHTMLRenderConvertors(linkAttributes && sanitizeLinkAttribute(linkAttributes), renderers, rules)
    })
    const html = renderer.render(document.getRootNode()).replace(/\sdata-nodeid="\d+"/g, '')

    if (!sanitizer) {
        return html
    }
    registerHTMLTagToWhitelist(renderers)

    return sanitizer(html)
}
