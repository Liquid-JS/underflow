---
title: Editing
group: Guides
---

# Editing

Options and methods that shape editing in the markdown and WYSIWYG modes. Every option is also described in the
`EditorOptions` type.

## Links, images and tables in WYSIWYG mode

-   Clicking a **link** opens a panel to edit its text and URL, or to remove the link.
-   Clicking an **image** opens a panel to edit its URL and description (the alt text), or to delete the image.
-   Hovering a **table** shows buttons on its edges: `+` on a divider adds a row or column there, `×` removes a row, a
    column or the whole table. Pressing <kbd>Tab</kbd> in the last cell adds a new row, and double-clicking a cell selects
    its content.

All of them write standard markdown. Each can be turned off:

```js
new Editor({
    el,
    editPanel: {
        useLinkEditPanel: false,
        useImageEditPanel: false,
        useTableEditPanel: false
    }
})
```

Headings, tables, horizontal rules and code blocks can't be inserted inside table cells in WYSIWYG mode, because
markdown can't express them there. List items and block quotes take them, as in CommonMark.

## Keyboard

<kbd>Shift</kbd>+<kbd>Ctrl/⌘</kbd>+<kbd>U</kbd> turns the selected lines into a task list, next to
<kbd>Ctrl/⌘</kbd>+<kbd>U</kbd> and <kbd>Ctrl/⌘</kbd>+<kbd>O</kbd> for bullet and numbered lists; in markdown mode,
<kbd>Shift</kbd>+<kbd>Ctrl</kbd>+<kbd>X</kbd> checks or unchecks the task items in the selection.
<kbd>Shift</kbd>+<kbd>Ctrl/⌘</kbd>+<kbd>.</kbd> turns the selected lines into a block quote.
<kbd>Shift</kbd>+<kbd>Enter</kbd> inserts a line break within a paragraph in WYSIWYG mode.
<kbd>Tab</kbd> and <kbd>Shift</kbd>+<kbd>Tab</kbd> indent and outdent list items and move between table cells.
Toolbar buttons show their shortcuts in their accessible names and tooltips. The toolbar follows the ARIA toolbar
pattern: <kbd>Tab</kbd> moves to it, arrow keys move between its buttons, and <kbd>Esc</kbd> closes popups and the
"More" menu.

Set `toolbarStyle: 'wrap'` to let the toolbar wrap onto several lines instead of moving buttons into the "More" menu on
narrow screens.

## Markdown shortcuts in WYSIWYG mode

Markdown typed at the start of a paragraph turns into the block it stands for:

| Type                                                                        | Becomes                                  |
| --------------------------------------------------------------------------- | ---------------------------------------- |
| `#` to `######`, then a space                                               | a heading                                |
| `>` and a space                                                             | a block quote                            |
| `-`, `*` or `+` and a space                                                 | a bullet list                            |
| `1.` (any number) and a space                                               | a numbered list, starting at that number |
| `[ ]` or `[x]` and a space                                                  | a task, also in a list item              |
| ```` ``` ```` (with an optional language, like ```` ```js ````) and a space | a code block                             |

<kbd>Backspace</kbd> right after a conversion undoes it and keeps the typed text.

## Line breaks and empty lines

WYSIWYG writes standard markdown that other renderers show the same way:

-   a line break within a paragraph (<kbd>Shift</kbd>+<kbd>Enter</kbd>) is a backslash at the end of the line, `<br>` in a
    table cell;
-   each empty line beyond the one that separates two paragraphs is a line holding just a backslash, in front of the
    text that follows it. Markdown can't express empty lines with no text after them, at the end of the document or of
    a list item, so they're left out.

```md
First paragraph

\
After an extra empty line,\
and a line break.
```

## Pasting and dropping

`stripPastedStyles: true` removes inline styles from HTML pasted into the WYSIWYG editor, and unwraps `span` and `font`
elements that are left without attributes. It's off by default.

Pasted and dropped image files go to the `addImageBlobHook`, which uploads them and returns their URL. So do images with
a `data:` URL in pasted or dropped HTML, such as an image dragged from another page, so the markdown doesn't get the
image's whole content as its URL; they keep their description. Without the hook, those images aren't inserted. The
default hook inserts them as `data:` URLs. Images copied or moved within the editor stay as they are.

Content dropped on an empty paragraph replaces it, as pasted content does.

Markdown tables can't merge cells, so merged cells in pasted HTML or HTML given to `setHTML()` are split, as remark
does: the first cell keeps the content and the cells it covered are left empty. An HTML table written in the markdown
itself keeps its merged cells, and WYSIWYG shows it as its source.

## The markdown editor

`cursorLineHighlight` (default `true`) highlights the line with the cursor in the markdown editor;
`previewHighlight` (default `true`) highlights the matching block in the preview.

## Commands

`exec(name, payload?)` runs a command in the current mode, the same way a toolbar button or shortcut does. Commands
work on the selection or the cursor, so this makes the selected text bold and turns its block into a second-level heading:

```js
editor.exec('bold')
editor.exec('heading', { level: 2 })
```

| Command                                 | Payload                     | Does                                                                  |
| --------------------------------------- | --------------------------- | --------------------------------------------------------------------- |
| `bold`, `italic`, `strike`, `code`      |                             | toggles the mark on the selection                                     |
| `heading`                               | `{ level }` (1 to 6)        | turns the block into a heading                                        |
| `bulletList`, `orderedList`, `taskList` |                             | turns the blocks into a list                                          |
| `blockQuote`, `codeBlock`               |                             | wraps the blocks in a block quote or code block                       |
| `indent`, `outdent`                     |                             | indents or outdents list items                                        |
| `hr`                                    |                             | inserts a horizontal rule                                             |
| `addLink`                               | `{ linkUrl, linkText }`     | inserts a link with `linkText` as its text, in place of the selection |
| `addImage`                              | `{ imageUrl, altText }`     | inserts an image                                                      |
| `addTable`                              | `{ rowCount, columnCount }` | inserts an empty table; `rowCount` includes the header row            |
| `undo`, `redo`, `selectAll`             |                             |                                                                       |

WYSIWYG mode also has commands for the table at the cursor: `addRowToUp`, `addRowToDown`, `addColumnToLeft`,
`addColumnToRight`, `removeRow`, `removeColumn`, `removeTable`, and `alignColumn` with `{ align }` (`left`, `center`
or `right`). Markdown mode has `toggleScrollSync`.

Plugins add their own commands (see [Plugins](plugin.md#markdowncommands-wysiwygcommands)), and
`addCommand(type, name, command)` adds one to the `markdown` or `wysiwyg` mode directly; `command` gets the same
arguments as a plugin's command.

## Focus and cursor

-   `autofocus` (default `true`) focuses the editor when it's created.
-   `setMarkdown(markdown, cursorToEnd?, focus?)` and `setHTML(html, cursorToEnd?, focus?)` replace the content; pass
    `false` as `focus` to keep the focus where it is.
-   `moveCursorTo(line, focus?)` moves the cursor to the start of a line, and `getCursorLine()` returns the line the
    cursor is on (both 1-based). In markdown mode these are source lines; in WYSIWYG mode each paragraph, heading, list
    item, table row and code block line counts as one line.
-   `getCurrentToolbarState()` returns which toolbar items are active or disabled at the cursor, for building your own
    toolbar.
