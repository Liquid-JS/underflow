# Plugins

## What Is a Plugin?

A plugin is an extension that you add to the editor or the viewer when you need it. Plugins can change how markdown is
rendered, add commands and toolbar items, and hook into ProseMirror, so they are also the way to support a custom
markdown flavour (see [Creating Your Own Plugin](#creating-your-own-plugin)).

UnderFlow includes one plugin:

| Plugin                                                     | Import                                               | Description                          |
| ---------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------ |
| [`code-syntax-highlight`](code-syntax-highlight-plugin.md) | `@liquid-js/underflow/plugins/code-syntax-highlight` | Highlights the syntax of code blocks |

## How to Use a Plugin

Plugins are part of the `@liquid-js/underflow` package, so there's nothing extra to install apart from the plugin's own
peer dependencies. Import the plugin function from its entry point:

```js
import { codeSyntaxHighlightPlugin } from '@liquid-js/underflow/plugins/code-syntax-highlight'
```

### Using the Plugin in the Editor

Pass the plugins to the editor's `plugins` option: plugin functions, or `[plugin, options]` pairs.

```js
const editor = new Editor({
    // ...
    plugins: [plugin]
})
```

If a plugin takes options, add it to the `plugins` array as a `[plugin, options]` tuple.

```js
const pluginOptions = {
    // ...
}

const editor = new Editor({
    // ...
    plugins: [[plugin, pluginOptions]]
})
```

For example, the `code-syntax-highlight` plugin takes a highlight.js instance as its `highlighter` option:

```js
import hljs from 'highlight.js'
import { Editor } from '@liquid-js/underflow'
import { codeSyntaxHighlightPlugin } from '@liquid-js/underflow/plugins/code-syntax-highlight'

const editor = new Editor({
    // ...
    plugins: [[codeSyntaxHighlightPlugin, { highlighter: hljs }]]
})
```

## Creating Your Own Plugin

Besides the included plugins, you can write your own plugin functions. A plugin function receives a
[`context`](#context-parameter-of-plugin-function) and the plugin's options, and returns an object with the properties
described below.

```ts
interface PluginInfo {
    toHTMLRenderers?: CustomHTMLRenderer
    toMarkdownRenderers?: ToMdConvertorMap
    markdownPlugins?: PluginProp[]
    wysiwygPlugins?: PluginProp[]
    wysiwygNodeViews?: NodeViewPropMap
    markdownCommands?: PluginCommandMap
    wysiwygCommands?: PluginCommandMap
    toolbarItems?: PluginToolbarItem[]
    markdownParsers?: CustomParserMap
}

const pluginResult: PluginInfo = {
    // ...
}

function customPlugin() {
    // ...
    return pluginResult
}
```

Like other plugins, add your plugin function to the `plugins` option.

```js
const editor = new Editor({
    // ...
    plugins: [customPlugin]
})
```

### Plugin Return Object

Let's find out the properties of the objects returned by the plugin. There are a total of 9 properties, as shown below, and user can define only the desired properties for customization.

```ts
interface PluginInfo {
    toHTMLRenderers?: CustomHTMLRenderer
    toMarkdownRenderers?: ToMdConvertorMap
    markdownCommands?: PluginCommandMap
    wysiwygCommands?: PluginCommandMap
    toolbarItems?: PluginToolbarItem[]
    markdownPlugins?: PluginProp[]
    wysiwygPlugins?: PluginProp[]
    wysiwygNodeViews?: NodeViewPropMap
    markdownParsers?: CustomParserMap
}
```

`markdownParsers` are called for the parsed nodes of their type, entering and leaving, so a plugin can adjust the
parser's output.

#### toHTMLRenderers

`toHTMLRenderers` object can change the rendering results of elements when rendered in the Markdown Preview or when converted from Markdown Editor to WYSIWYG Editor. It works the same as the editor's [customHTMLRenderer](custom-html-renderer.md) option.

**toMarkdownRenderers**

`toMarkdownRenderers` object can override markdown text that is converted from WYSIWYG editor to Markdown editor. The function defined in `toMarkdownRenderers` object has 2 parameters: `nodeInfo` and `context`.

-   `nodeInfo`: WYSIWYG node information when converting from WYSIWYG editor to Markdown editor.
    -   `node`: The information about the target node.
    -   `parent`: The parent node information of the target node.
    -   `index`: The index as child.
-   `context`: The information needed for converting except `nodeInfo`.
    -   `entering`: This can be seen whether it is a first visit to that node or if it is a visit after traversing all of the child nodes.
    -   `origin`: The function that executes the operation of an original converting function.

The function defined in `toMarkdownRenderers` returns the token information needed to convert the result to markdown text.

```ts
interface ToMdConvertorReturnValues {
    delim?: string | string[]
    rawHTML?: string | string[] | null
    text?: string
    attrs?: Attrs
}
```

-   `delim`: Defines symbols to be used in markdown text. It is used when it can be converted to multiple symbols, such as `*` and `-` on a list of markdown bullet list.
-   `rawHTML`: This text is required when converting a node to an HTML node (HTML text) in Markdown.
-   `text`: Text to be shown in Markdown.
-   `attrs`: Properties to use when converting a node to markdown text. For example, whether the task list is checked or not, or the url of the image node.

**Example**

```ts
import type { MdNode, PluginInfo } from '@liquid-js/underflow'
import type { OpenTagToken } from '@liquid-js/underflow/parser'

export function myPlugin(): PluginInfo {
    return {
        toHTMLRenderers: {
            // load the images in the preview lazily
            image(node: MdNode, { origin }) {
                const token = origin!() as OpenTagToken

                token.attributes = { ...token.attributes, loading: 'lazy' }

                return token
            }
        },
        toMarkdownRenderers: {
            // write thematic breaks as `---` instead of `***`
            thematicBreak(nodeInfo, { origin }) {
                return { ...origin!(), delim: '---' }
            }
        }
    }
}
```

The `image` renderer in `toHTMLRenderers` adds `loading="lazy"` to the images the Markdown Preview shows, and the
`thematicBreak` renderer in `toMarkdownRenderers` changes how thematic breaks are written when WYSIWYG content is
converted to markdown. Both start from `origin()`, the result of the original renderer, and change only what they need.

#### markdownCommands, wysiwygCommands

Plugin allows adding of markdown and WYSIWYG commands using `markdownCommands` and `wysiwygCommands` options.

Each command function has 4 parameters: `payload`, `state`, `dispatch` and `view`, which can be used to control the internal operation of the editor based on [Prosemirror](https://prosemirror.net/).

-   `payload`: This is a `payload` that is needed to execute commands.
-   `state`: An instance indicating the editor's internal state, which is the same as [prosemirror-state](https://prosemirror.net/docs/ref/#state).
-   `dispatch`: If you want to change the contents of an editor through command execution, you have to run the `dispatch` function. It is same as [dispatch](https://prosemirror.net/docs/ref/#view.EditorView.dispatch) function of Prosemirror.
-   `view`: The editor's [ProseMirror view](https://prosemirror.net/docs/ref/#view.EditorView).

If a change occurs in the editor's content by executing a command function, it must return `true`. In the opposite case, `false` must be returned.

```js
return {
    markdownCommands: {
        myCommand: (payload, state, dispatch) => {
            // ...
            return true
        }
    },
    wysiwygCommands: {
        myCommand: (payload, state, dispatch) => {
            // ...
            return true
        }
    }
}
```

If you define and return a command function in a plugin, as shown in the example code above, that command can be used in the editor.

#### toolbarItems

You can also register an editor's toolbar item from the plugin.

```js
return {
    // ...
    toolbarItems: [
        {
            groupIndex: 0,
            itemIndex: 3,
            item: toolbarItem
        }
    ]
}
```

Like the code above, you can set which items to add to the `toolbarItems` array. Each option object has 3 properties: `groupIndex`, `itemIndex`, and item\`.

-   `groupIndex`: Toolbar group index to add toolbar item.
-   `itemIndex`: Toolbar item index in group.
-   `item`: Toolbar Item. It has the same form as the object used in [toolbar customization](toolbar.md).

If the `toolbarItems` option is set, as in the example code, the toolbar item will be added as the fourth index of the first toolbar group.

#### markdownPlugins, wysiwygPlugins

The editor use Prosemirror internally. Prosemirror provides its own plugin system. These Prosemirror plugins can also be defined in order to control out editor's internal state. In most cases, these options are not necessary, but are often necessary. For example, code syntax highlighting plugin are used to highlight code displayed in the WYSIWYGs editor `codeBlock`.

```js
return {
    wysiwygPlugins: [() => codeSyntaxHighlighting(context, hljs, lineNumbers)]
}
```

The method of using this option object is the same as the plugin definition method in Prosemirror, so see [the ProseMirror reference](https://prosemirror.net/docs/ref/#state.Plugin).

#### wysiwygNodeViews

Markdown Editor's contents is plain text, but WYSIWYG Editor's content consists of specific nodes. These nodes can be customized to add attribute or class using the `customHTMLRenderer` option. However, there is a limit to `customHTMLRenderer` option if you want to control something by adding event handlers or having more complex interactions. In this case, the plugin's `wysiwygNodeViews` option allows customization of nodes that are rendered in the WYSIWYG Editor.
This option will also be unnecessary in most cases. Like the `wysiwygPlugins` property, the `wysiwygNodeViews` property is also used in code syntax highlighting plugin.

```js
return {
    wysiwygNodeViews: {
        codeBlock: createCodeSyntaxHighlightView(
            hljs.listLanguages(),
            (language) => !!hljs.getLanguage(language)
        )
    }
}
```

The method of using this option object is the same as the `nodeView` definition method in Prosemirror, so see [the ProseMirror reference](https://prosemirror.net/docs/ref/#view.NodeView).

### 'context' parameter of plugin function

Plugin functions can use some information with `context` parameters to define the various properties described above. The `context` parameter contains the following properties.

-   `eventEmitter`: It is the same as `eventEmitter` in an editor. It is used to communicate with the editor.
-   `instance`: The editor or viewer instance the plugin is added to.
-   `i18n`: It is an instance for adding i18n.
-   `pmState`: Some modules of [prosemirror-state](https://prosemirror.net/docs/ref/#state).
-   `pmView`: Some modules of [prosemirror-view](https://prosemirror.net/docs/ref/#view).
-   `pmModel`: Some modules of [prosemirror-model](https://prosemirror.net/docs/ref/#model).
-   `pmRules`: `inputRules`, `InputRule` and `undoInputRule` of [prosemirror-inputrules](https://prosemirror.net/docs/ref/#inputrules).
-   `pmKeymap`: `keymap` of [prosemirror-keymap](https://prosemirror.net/docs/ref/#keymap).

## Example

This plugin renders the [custom block](custom-block.md) `$$latex` with [latex.js](https://latex.js.org), in the preview
and in WYSIWYG mode.

```js
import { Editor } from '@liquid-js/underflow'
import * as latexjs from 'latex.js'

// Step 1: define the plugin function
function latexPlugin() {
    const toHTMLRenderers = {
        latex(node) {
            const generator = new latexjs.HtmlGenerator({ hyphenate: false })
            const { body } = latexjs.parse(node.literal, { generator }).htmlDocument()

            return [
                { type: 'openTag', tagName: 'div', outerNewLine: true },
                { type: 'html', content: body.innerHTML },
                { type: 'closeTag', tagName: 'div', outerNewLine: true }
            ]
        }
    }

    return { toHTMLRenderers }
}

const content = [
    '$$latex',
    '\\documentclass{article}',
    '\\begin{document}',
    '',
    '$',
    'f(x) = \\int_{-\\infty}^\\infty \\hat f(\\xi)\\,e^{2 \\pi i \\xi x} \\, d\\xi',
    '$',
    '\\end{document}',
    '$$'
].join('\n')

// Step 2: add it to the plugins option
const editor = new Editor({
    el: document.querySelector('#editor'),
    previewStyle: 'vertical',
    height: '500px',
    initialValue: content,
    plugins: [latexPlugin]
})
```

The [code-syntax-highlight plugin source](../src/plugins/code-syntax-highlight/) is a complete example that also uses
`wysiwygPlugins` and `wysiwygNodeViews`.
