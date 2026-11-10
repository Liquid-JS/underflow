---
title: Theming
group: Guides
---

# Theming

UnderFlow separates the editor's own interface (toolbar, tabs, popups, menus) from the content you write. The
interface is themed through CSS variables; the content keeps plain element styles, so you can make the preview look like
the page the markdown ends up on.

## Light and dark

The editor and the viewer start in the `light` theme. Pass `theme: 'dark'` and load the dark stylesheet to start in the
dark theme, and switch at runtime with `setTheme()`:

```js
import { Editor } from '@liquid-js/underflow'
import '@liquid-js/underflow/styles/editor.css'
import '@liquid-js/underflow/styles/theme/dark.css'

const editor = new Editor({ el, theme: 'dark' })

editor.setTheme('light')
editor.on('changeTheme', (theme) => console.log(`now using ${theme}`))
```

`Viewer` has the same `theme` option and `setTheme()` method.

## Custom themes

A theme is a class on the editor's root element: `setTheme('ocean')` adds `uf-ocean`. Define the colour
variables on that class to create a theme of your own; anything you leave out falls back to the light values.

```css
.uf-ocean {
    --uf-bg-color: #f3f8fb;
    --uf-toolbar-bg-color: #e3eef5;
    --uf-primary-color: #0b5f8a;
    --uf-primary-hover-color: #0e74a8;
    --uf-icon-color: #33495a;
    --uf-icon-active-color: #0b5f8a;
}
```

The variables are listed below; their values are in `src/editor/styles/ui/_variables.scss` and `theme/dark.scss`:

| Variable                                                                                                                  | Used for                                                         |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `--uf-bg-color`, `--uf-text-color`                                                                                        | Editor background and text                                       |
| `--uf-label-color`, `--uf-muted-text-color`, `--uf-disabled-text-color`                                                   | Labels, secondary and disabled text                              |
| `--uf-icon-color`, `--uf-icon-active-color`                                                                               | Toolbar and menu icons, and the icon of an active toolbar button |
| `--uf-border-color`, `--uf-divider-color`, `--uf-input-border-color`                                                      | Borders, dividers and form fields                                |
| `--uf-toolbar-bg-color`, `--uf-toolbar-divider-color`                                                                     | Toolbar                                                          |
| `--uf-toolbar-button-hover-bg-color`, `--uf-toolbar-button-hover-border-color`, `--uf-toolbar-button-active-border-color` | Toolbar buttons                                                  |
| `--uf-tab-bg-color`, `--uf-tab-border-color`, `--uf-tab-text-color`, `--uf-active-tab-text-color`                         | Write/Preview and Markdown/WYSIWYG tabs                          |
| `--uf-button-border-color`, `--uf-button-hover-border-color`                                                              | Buttons in popups                                                |
| `--uf-primary-color`, `--uf-primary-hover-color`, `--uf-primary-text-color`                                               | Primary buttons, links in the interface, focus outlines          |
| `--uf-hover-bg-color`, `--uf-selection-bg-color`                                                                          | Hovered menu items, selected table cells                         |
| `--uf-tooltip-bg-color`                                                                                                   | Tooltips                                                         |
| `--uf-scroll-sync-color`, `--uf-switch-bg-color`, `--uf-switch-checked-bg-color`, `--uf-switch-knob-color`                | Scroll sync switch                                               |
| `--uf-cursor-line-bg-color`                                                                                               | Highlight of the cursor line in the markdown editor              |
| `--uf-md-widget-bg-color`                                                                                                 | Background of widget text in the markdown editor                 |

The toolbar and table menu icons are inline SVG [Tabler Icons](https://tabler.io/icons) drawn in `currentColor`, so
they take their colour from these variables in every theme.

## Styling the content

The preview, the WYSIWYG editor and the viewer render markdown inside an element with the
`uf-contents` class, styled by `styles/editor.css` (or `styles/viewer.css` for the viewer). To use your own
content styles instead, load `styles/editor-only.css`, which has the editor interface without any content styles, and
style `.uf-contents` like the container your markdown is shown in:

```js
import '@liquid-js/underflow/styles/editor-only.css'
import './my-article-styles.css' // e.g. `.uf-contents h1 { ... }`
```

## Sass

The stylesheets are also published as Sass sources under `@liquid-js/underflow/scss/`, with the same names as the CSS
files (`editor.scss`, `editor-only.scss`, `viewer.scss`, `theme/dark.scss`, `plugins/code-syntax-highlight.scss`).
Use them to compile the styles as part of your own stylesheets, together with your own processing:

```scss
@use "@liquid-js/underflow/scss/editor";
@use "@liquid-js/underflow/scss/theme/dark";
```

The stylesheets use no images, so there are no files to resolve: the icons are inline SVG in the JavaScript.
Bundlers such as Vite and the Angular CLI resolve these paths, with or without the `.scss` extension. With the Sass
CLI, use `pkg:` URLs (`@use "pkg:@liquid-js/underflow/scss/editor"`) with `--pkg-importer=node`, and add
`--load-path=node_modules` for the ProseMirror stylesheet that `editor.scss` loads.

Syntax highlighting in code blocks comes from any [highlight.js theme](https://highlightjs.org/demo) when you use the
[code syntax highlight plugin](code-syntax-highlight-plugin.md).
