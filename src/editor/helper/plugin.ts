import { Plugin, PluginKey, Selection, TextSelection } from 'prosemirror-state'
import { inputRules, InputRule, undoInputRule } from 'prosemirror-inputrules'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { keymap } from 'prosemirror-keymap'
import { Fragment } from 'prosemirror-model'
import { EditorPluginInfo, EditorPluginsInfo } from '../types/editor'
import { PluginInfoResult } from '../types/plugin'
import { i18n as defaultI18n } from '../i18n/i18n'
import { deepMergedCopy } from '../utils/common'

function execPlugin(pluginInfo: EditorPluginInfo) {
    const { plugin, eventEmitter, instance, i18n = defaultI18n } = pluginInfo

    const pmState = { Plugin, PluginKey, Selection, TextSelection }
    const pmView = { Decoration, DecorationSet }
    const pmModel = { Fragment }
    const pmRules = { InputRule, inputRules, undoInputRule }
    const pmKeymap = { keymap }
    const context = {
        eventEmitter,
        instance,
        pmState,
        pmView,
        pmModel,
        pmRules,
        pmKeymap,
        i18n
    }

    if (Array.isArray(plugin)) {
        const [pluginFn, options = {}] = plugin

        return pluginFn(context, options)
    }

    return plugin(context)
}

export function getPluginInfo(pluginsInfo: EditorPluginsInfo) {
    const { plugins, eventEmitter, instance, i18n } = pluginsInfo

    return (plugins ?? []).reduce<PluginInfoResult>(
        (acc, plugin) => {
            const pluginInfoResult = execPlugin({
                plugin,
                eventEmitter,
                instance,
                i18n
            })

            if (!pluginInfoResult) {
                throw new Error('The return value of the executed plugin is empty.')
            }

            const {
                markdownParsers,
                toHTMLRenderers,
                toMarkdownRenderers,
                markdownPlugins,
                wysiwygPlugins,
                wysiwygNodeViews,
                markdownCommands,
                wysiwygCommands,
                toolbarItems
            } = pluginInfoResult

            if (toHTMLRenderers) {
                acc.toHTMLRenderers = deepMergedCopy(acc.toHTMLRenderers, toHTMLRenderers)
            }

            if (toMarkdownRenderers) {
                acc.toMarkdownRenderers = deepMergedCopy(acc.toMarkdownRenderers, toMarkdownRenderers)
            }

            if (markdownPlugins) {
                acc.mdPlugins = acc.mdPlugins!.concat(markdownPlugins)
            }

            if (wysiwygPlugins) {
                acc.wwPlugins = acc.wwPlugins!.concat(wysiwygPlugins)
            }

            if (wysiwygNodeViews) {
                acc.wwNodeViews = { ...acc.wwNodeViews, ...wysiwygNodeViews }
            }

            if (markdownCommands) {
                acc.mdCommands = { ...acc.mdCommands, ...markdownCommands }
            }

            if (wysiwygCommands) {
                acc.wwCommands = { ...acc.wwCommands, ...wysiwygCommands }
            }

            if (toolbarItems) {
                acc.toolbarItems = acc.toolbarItems!.concat(toolbarItems)
            }

            if (markdownParsers) {
                acc.markdownParsers = { ...acc.markdownParsers, ...markdownParsers }
            }

            return acc
        },
        {
            toHTMLRenderers: {},
            toMarkdownRenderers: {},
            mdPlugins: [],
            wwPlugins: [],
            wwNodeViews: {},
            mdCommands: {},
            wwCommands: {},
            toolbarItems: [],
            markdownParsers: {}
        }
    )
}
