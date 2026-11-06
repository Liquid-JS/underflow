import hljs from 'highlight.js/lib/common'
import { codeSyntaxHighlightPlugin } from '../src/plugins/code-syntax-highlight.ts'
import { Editor } from '../src/index.ts'
import { Viewer } from '../src/viewer.ts'
import content from './content.md?raw'
import 'highlight.js/styles/github.css'
import '../src/plugins/code-syntax-highlight/styles/plugin.scss'
import '../src/editor/styles/editor.scss'
import '../src/editor/styles/theme/dark.scss'
import './demo.scss'

const editor = new Editor({
    el: document.querySelector<HTMLElement>('#editor')!,
    height: '560px',
    initialEditType: 'markdown',
    previewStyle: 'vertical',
    initialValue: content,
    plugins: [[codeSyntaxHighlightPlugin, { highlighter: hljs, lineNumbers: true }]]
})

const viewer = new Viewer({
    el: document.querySelector<HTMLElement>('#viewer')!,
    initialValue: content,
    plugins: [[codeSyntaxHighlightPlugin, { highlighter: hljs, lineNumbers: true }]]
})

editor.on('change', () => viewer.setMarkdown(editor.getMarkdown()))

document.querySelector<HTMLSelectElement>('#mode')!.addEventListener('change', (ev) => {
    editor.changeMode((ev.target as HTMLSelectElement).value as 'markdown' | 'wysiwyg')
})

document.querySelector<HTMLInputElement>('#dark')!.addEventListener('change', (ev) => {
    const dark = (ev.target as HTMLInputElement).checked
    const theme = dark ? 'dark' : 'light'

    editor.setTheme(theme)
    viewer.setTheme(theme)
    document.body.classList.toggle('dark', dark)
})

Object.assign(window, { editor, viewer })
