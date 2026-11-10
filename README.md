# UnderFlow

<img align="right" src="https://raw.githubusercontent.com/Liquid-JS/underflow/master/docs/images/icon.svg" width="144" alt="UnderFlow">

[![GitHub license](https://img.shields.io/github/license/Liquid-JS/underflow.svg)](https://github.com/Liquid-JS/underflow/blob/master/LICENSE)
[![npm](https://img.shields.io/npm/dm/@liquid-js/underflow.svg)](https://www.npmjs.com/package/@liquid-js/underflow)
[![scope](https://img.shields.io/npm/v/@liquid-js/underflow.svg)](https://www.npmjs.com/package/@liquid-js/underflow)

A markdown editor with a live preview and a WYSIWYG mode. It reads and writes CommonMark and
GitHub Flavored Markdown, and its WYSIWYG mode is built on [ProseMirror](https://prosemirror.net).

The editor keeps its focus on content: the markdown it writes is standard CommonMark/GFM that other renderers (remark,
GitHub, markdown-it) display the same way, and the preview uses plain element styles so you can apply your own site's
stylesheet to it.

Try it here <https://liquid-js.github.io/underflow/demo/>

## Installation

```sh
npm install @liquid-js/underflow prosemirror-commands prosemirror-history prosemirror-inputrules \
    prosemirror-keymap prosemirror-model prosemirror-state prosemirror-transform prosemirror-view dompurify
```

ProseMirror and DOMPurify are peer dependencies, so your application controls their versions and
loads a single copy of each.

## Documentation

The guides and the API reference are at <https://liquid-js.github.io/underflow/docs/>.

## Usage

```ts
import { Editor } from '@liquid-js/underflow'
import '@liquid-js/underflow/styles/editor.css'

const editor = new Editor({
    el: document.querySelector('#editor')!,
    height: '500px',
    initialEditType: 'markdown',
    previewStyle: 'vertical',
    initialValue: '# Hello'
})

editor.on('change', () => console.log(editor.getMarkdown()))
```

To only display markdown, use the viewer, which doesn't load the editing code:

```ts
import { Viewer } from '@liquid-js/underflow/viewer'
import '@liquid-js/underflow/styles/viewer.css'

new Viewer({ el: document.querySelector('#viewer')!, initialValue: '# Hello' })
```

The JavaScript is minified ES2024, with source maps, that leaves its dependencies to your bundler, and the stylesheets
are standard CSS without vendor prefixes: add the prefixes your browser targets need in your application's build, e.g.
with Autoprefixer or Lightning CSS.

### Entry points

| Import                                                          | Contents                                                                                                                                                                                               |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@liquid-js/underflow`                                          | `Editor`, `EditorCore` and `Viewer`                                                                                                                                                                    |
| `@liquid-js/underflow/viewer`                                   | `Viewer`                                                                                                                                                                                               |
| `@liquid-js/underflow/parser`                                   | The incremental markdown parser                                                                                                                                                                        |
| `@liquid-js/underflow/render`                                   | `renderMarkdown()`, which renders markdown to HTML as the viewer does, on the server too                                                                                                               |
| `@liquid-js/underflow/i18n/<locale>`                            | UI translations, e.g. `i18n/de-de`                                                                                                                                                                     |
| `@liquid-js/underflow/plugins/code-syntax-highlight`            | Syntax highlighting for code blocks                                                                                                                                                                    |
| `@liquid-js/underflow/styles/editor.css`                        | Editor UI and contents styles                                                                                                                                                                          |
| `@liquid-js/underflow/styles/editor-only.css`                   | Editor UI without the contents styles, for use with your own                                                                                                                                           |
| `@liquid-js/underflow/styles/viewer.css`                        | Contents styles for the viewer                                                                                                                                                                         |
| `@liquid-js/underflow/styles/theme/dark.css`                    | Dark theme, enabled with the `theme: 'dark'` option                                                                                                                                                    |
| `@liquid-js/underflow/styles/plugins/code-syntax-highlight.css` | Styles of the syntax highlighting plugin                                                                                                                                                               |
| `@liquid-js/underflow/scss/<file>`                              | The Sass sources of the stylesheets above, with or without the `.scss` extension, to compile in your own build (see [Theming](https://liquid-js.github.io/underflow/docs/documents/Theming.html#sass)) |

## Development

```sh
yarn install
yarn start      # demo page with the editor and viewer, served from source
yarn build      # library into lib/
yarn test       # unit and integration tests
yarn lint
```

See [CONTRIBUTING.md](https://github.com/Liquid-JS/underflow/blob/master/CONTRIBUTING.md) for the commit conventions.

## License

[MIT License](https://github.com/Liquid-JS/underflow/blob/master/LICENSE)
