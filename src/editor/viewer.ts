import { MarkdownDocument } from '../parser/markdown-document'
import { ViewerOptions } from './types/editor'
import { Emitter, EventName, Handler } from './types/event'
import { forEachOwnProperties } from './utils/native'
import { MarkdownPreview } from './markdown/md-preview'
import { getPluginInfo } from './helper/plugin'
import { last, sanitizeLinkAttribute } from './utils/common'
import { EventEmitter } from './event/event-emitter'
import { cls } from './utils/dom'
import { registerHTMLTagToWhitelist, sanitizeHTML } from './sanitizer/html-sanitizer'
import { WidgetRules } from './widget/rules'

/** Shows markdown as HTML, without the editing code; see docs/viewer.md. */
class Viewer {
    private options: Required<ViewerOptions>

    private markdownDocument: MarkdownDocument

    private eventEmitter: Emitter

    private preview: MarkdownPreview

    constructor(options: ViewerOptions) {
        this.options = {
            linkAttributes: null,
            extendedAutolinks: false,
            customHTMLRenderer: null,
            referenceDefinition: false,
            customHTMLSanitizer: null,
            frontMatter: false,
            theme: 'light',
            widgetRules: [],
            ...options
        } as Required<ViewerOptions>
        this.eventEmitter = new EventEmitter()

        const linkAttributes = sanitizeLinkAttribute(this.options.linkAttributes)
        const { toHTMLRenderers, markdownParsers } =
            getPluginInfo({
                plugins: this.options.plugins,
                eventEmitter: this.eventEmitter,
                instance: this
            }) || {}
        const {
            customHTMLRenderer,
            extendedAutolinks,
            referenceDefinition,
            frontMatter,
            customHTMLSanitizer,
            widgetRules
        } = this.options
        const rules = new WidgetRules(widgetRules)

        const rendererOptions = {
            linkAttributes,
            customHTMLRenderer: { ...toHTMLRenderers, ...customHTMLRenderer },
            extendedAutolinks,
            referenceDefinition,
            frontMatter,
            sanitizer: customHTMLSanitizer || sanitizeHTML
        }

        registerHTMLTagToWhitelist(rendererOptions.customHTMLRenderer)

        if (this.options.events) {
            forEachOwnProperties(this.options.events, (fn, key) => {
                this.on(key, fn)
            })
        }

        const { el, initialValue, theme } = this.options
        const existingHTML = el.innerHTML

        if (theme !== 'light') {
            el.classList.add(cls(theme))
        }
        el.innerHTML = ''

        this.markdownDocument = new MarkdownDocument('', {
            disallowedHtmlBlockTags: ['br', 'img'],
            extendedAutolinks,
            referenceDefinition,
            frontMatter,
            customParser: markdownParsers,
            widgetRules: rules.patterns
        })
        this.preview = new MarkdownPreview(this.eventEmitter, {
            ...rendererOptions,
            isViewer: true,
            widgetRules: rules,
            autoDirection: this.options.autoDirection
        })

        if (initialValue) {
            this.setMarkdown(initialValue)
        } else if (existingHTML) {
            this.preview.setHTML(existingHTML)
        }

        el.appendChild(this.preview.previewContent)
        this.eventEmitter.emit('load', this)
    }

    setMarkdown(markdown: string) {
        const lineTexts: string[] = this.markdownDocument.getLineTexts()
        const { length } = lineTexts
        const lastLine = last(lineTexts)
        const endSourcepos: [number, number] = [length, lastLine.length + 1]
        const editResult = this.markdownDocument.editMarkdown([1, 1], endSourcepos, markdown || '')

        this.eventEmitter.emit('updatePreview', editResult)
    }

    /** `light`, `dark` or a custom theme, styled through the `uf-{theme}` class */
    setTheme(theme: string) {
        const { el, theme: prevTheme } = this.options

        if (prevTheme !== theme) {
            if (prevTheme !== 'light') {
                el.classList.remove(cls(prevTheme))
            }
            if (theme !== 'light') {
                el.classList.add(cls(theme))
            }
            this.options.theme = theme
            this.eventEmitter.emit('changeTheme', theme)
        }
    }

    on(type: EventName, handler: Handler) {
        this.eventEmitter.listen(type, handler)
    }

    /** Removes all the handlers of an event. */
    off(type: EventName) {
        this.eventEmitter.removeEventHandler(type)
    }

    /** Replaces the handler of a hook. */
    addHook(type: string, handler: Handler) {
        this.eventEmitter.removeEventHandler(type)
        this.eventEmitter.listen(type, handler)
    }

    destroy() {
        this.preview.destroy()
        this.eventEmitter.emit('destroy')
    }

    isViewer() {
        return true
    }

    isMarkdownMode() {
        return false
    }

    isWysiwygMode() {
        return false
    }
}

export { Viewer }
