import type { PluginOptions } from './types'
import { createCodeSyntaxHighlightView } from './node-views/code-syntax-highlight-view'
import { codeSyntaxHighlighting } from './plugins/code-syntax-highlighting'
import { getHTMLRenderers } from './renderers/to-html-renderers'
import { normalizeLineNumbers } from './utils/highlight'
import type { PluginContext, PluginInfo } from '@liquid-js/underflow'

export function codeSyntaxHighlightPlugin(
    context: PluginContext,
    options: PluginOptions
): PluginInfo {
    const hljs = options?.highlighter

    if (!hljs) {
        return {}
    }

    const { eventEmitter } = context
    const lineNumbers = normalizeLineNumbers(options?.lineNumbers)

    eventEmitter.addEventType('showCodeBlockLanguages')
    eventEmitter.addEventType('selectLanguage')
    eventEmitter.addEventType('finishLanguageEditing')

    return {
        toHTMLRenderers: getHTMLRenderers(hljs, lineNumbers),
        wysiwygPlugins: [() => codeSyntaxHighlighting(context, hljs, lineNumbers)],
        wysiwygNodeViews: {
            codeBlock: createCodeSyntaxHighlightView(
                hljs.listLanguages(),
                (language) => !!hljs.getLanguage(language)
            )
        }
    }
}
