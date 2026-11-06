import type { HLJSApi } from 'highlight.js'

export interface PluginOptions {
    /**
     * The highlight.js instance used for highlighting, either the full build
     * (`import hljs from 'highlight.js'`) or the core with the languages you register
     * (`import hljs from 'highlight.js/lib/core'`).
     */
    highlighter: HLJSApi

    /**
     * Shows line numbers next to code blocks in the preview, the viewer and the WYSIWYG editor.
     * The numbers aren't part of the code, so they aren't copied with it.
     * `startFrom` sets the first number (default 1); `singleLine` also numbers code blocks with
     * a single line (default false).
     */
    lineNumbers?: boolean | { startFrom?: number, singleLine?: boolean }
}
