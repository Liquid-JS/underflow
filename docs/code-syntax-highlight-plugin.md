---
title: Code syntax highlight plugin
group: Guides
---

# Code Syntax Highlight Plugin

This plugin highlights the syntax of code blocks in the markdown preview, the WYSIWYG editor and the viewer. It uses
[highlight.js](https://highlightjs.org/) to highlight code, and in the WYSIWYG editor adds a language selector to code
blocks.

## Install

The plugin is part of `@liquid-js/underflow` (see [Getting Started](getting-started.md)). It needs `highlight.js`,
which is an optional peer dependency of the package, so install it as well:

```sh
yarn add highlight.js
```

## Usage

Pass a highlight.js instance as the `highlighter` option, and import the plugin's stylesheet together with any
[highlight.js theme](https://highlightjs.org/demo) for the token colours.

The full `highlight.js` build registers all of its languages. To keep the bundle small, import `highlight.js/lib/core`
instead and register the languages you need; the language selector in WYSIWYG mode lists the registered languages,
and code blocks also accept their aliases (for example `js` for `javascript`).

```js
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import yaml from 'highlight.js/lib/languages/yaml'
import 'highlight.js/styles/github.css'
import '@liquid-js/underflow/styles/plugins/code-syntax-highlight.css'

import { Editor } from '@liquid-js/underflow'
import { codeSyntaxHighlightPlugin } from '@liquid-js/underflow/plugins/code-syntax-highlight'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('yaml', yaml)

const editor = new Editor({
    // ...
    plugins: [[codeSyntaxHighlightPlugin, { highlighter: hljs }]]
})
```

Code blocks in a registered language get the classes `hljs language-<name>` on their `<code>` element, and their tokens
the usual `hljs-*` classes, so highlight.js themes apply to the preview and the WYSIWYG editor alike. Code blocks
without a language, or with one that isn't registered, are rendered as plain text.

### Line numbers

Set `lineNumbers` to show line numbers next to code blocks in the preview, the viewer and the WYSIWYG editor:

```js
plugins: [[codeSyntaxHighlightPlugin, { highlighter: hljs, lineNumbers: true }]],
// or
plugins: [[codeSyntaxHighlightPlugin, { highlighter: hljs, lineNumbers: { startFrom: 0, singleLine: true } }]]
```

-   `startFrom`: number of the first line (default `1`)
-   `singleLine`: also number code blocks that have a single line (default `false`)

The numbers are drawn by CSS (`.hljs-ln-line::before` in the preview, `.hljs-ln-n::before` in WYSIWYG), so they
aren't part of the code: copying code doesn't copy them, and the markdown is unchanged. Tokens that span several
lines, such as block comments, are split per line, so each line keeps its highlighting.

### With the Viewer

```js
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import '@liquid-js/underflow/styles/plugins/code-syntax-highlight.css'

import { Viewer } from '@liquid-js/underflow/viewer'
import { codeSyntaxHighlightPlugin } from '@liquid-js/underflow/plugins/code-syntax-highlight'

const viewer = new Viewer({
    // ...
    plugins: [[codeSyntaxHighlightPlugin, { highlighter: hljs }]]
})
```

`Editor.factory({ viewer: true, ... })` takes the same `plugins` option.
