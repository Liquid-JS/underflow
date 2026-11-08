import { Transaction } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { Fragment, Slice } from 'prosemirror-model'
import { ReplaceStep } from 'prosemirror-transform'
import { autoDirection, isMarkdownAutoDirectionLine } from '../plugins/auto-direction'

import { MdContext } from '../types/spec'
import { Emitter } from '../types/event'
import { WidgetStyle } from '../types/editor'
import { PluginProp } from '../types/plugin'
import { EditorBase } from '../base'
import { SpecManager } from '../spec/spec-manager'
import { emitImageBlobHook, pasteImageOnly } from '../helper/image'
import { createParagraph, createTextSelection } from '../helper/manipulation'
import { WidgetRules } from '../widget/rules'
import { Pos as MdPos } from '../../parser/types/node'
import { MarkdownDocument } from '../../parser/markdown-document'
import { widgetSource } from './plugins/widget-source'
import { syntaxHighlight } from './plugins/syntax-highlight'
import { previewHighlight } from './plugins/preview-highlight'
import { cursorLineHighlight } from './plugins/cursor-line-highlight'
import { Doc } from './nodes/doc'
import { Paragraph } from './nodes/paragraph'
import { TextNode } from './nodes/text'
import { Heading } from './marks/heading'
import { BlockQuote } from './marks/block-quote'
import { CodeBlock } from './marks/code-block'
import { Table } from './marks/table'
import { ThematicBreak } from './marks/thematic-break'
import { ListItem } from './marks/list-item'
import { Strong } from './marks/strong'
import { Strike } from './marks/strike'
import { Emph } from './marks/emph'
import { Code } from './marks/code'
import { Link } from './marks/link'
import { Delimiter, TaskDelimiter, MarkedText, Meta, TableCell } from './marks/simple-mark'
import { Html } from './marks/html'
import { CustomBlock } from './marks/custom-block'
import { getEditorToMdPos, getMdToEditorPos } from './helper/pos'
import { smartTask } from './plugins/smart-task'

interface MarkdownOptions {
    markdownDocument: MarkdownDocument
    useCommandShortcut?: boolean
    mdPlugins?: PluginProp[]
    cursorLineHighlight?: boolean
    widgetRules?: WidgetRules
    autoDirection?: boolean
}

const EVENT_TYPE = 'cut'
const reLineEnding = /\r\n|\n|\r/

export class MdEditor extends EditorBase {
    private markdownDocument: MarkdownDocument

    private cursorLineHighlight: boolean

    private autoDirection: boolean

    private sourceWidgetRules: WidgetRules

    context!: MdContext

    constructor(eventEmitter: Emitter, options: MarkdownOptions) {
        super(eventEmitter)

        const {
            markdownDocument,
            useCommandShortcut = true,
            mdPlugins = [],
            cursorLineHighlight: highlightCursorLine = false,
            widgetRules = new WidgetRules(),
            autoDirection: lineDirection = false
        } = options

        this.editorType = 'markdown'
        this.el.classList.add('md-mode')
        this.markdownDocument = markdownDocument
        this.cursorLineHighlight = highlightCursorLine
        this.autoDirection = lineDirection
        this.sourceWidgetRules = widgetRules
        this.extraPlugins = mdPlugins
        this.specs = this.createSpecs()
        this.schema = this.createSchema()
        this.context = this.createContext()
        this.keymaps = this.createKeymaps(useCommandShortcut)
        this.view = this.createView()
        this.commands = this.createCommands()
        this.specs.setContext({ ...this.context, view: this.view })
        // To prevent unnecessary focus setting during initial rendering
        this.eventEmitter.listen('changePreviewTabWrite', (isMarkdownTabMounted?: boolean) =>
            this.toggleActive(true, isMarkdownTabMounted)
        )
        this.eventEmitter.listen('changePreviewTabPreview', () => this.toggleActive(false))
        this.initEvent()
    }

    private toggleActive(active: boolean, isMarkdownTabMounted?: boolean) {
        this.el!.classList.toggle('active', active)
        if (active) {
            if (!isMarkdownTabMounted) {
                this.focus()
            }
        } else {
            this.blur()
        }
    }

    /**
     * Pasted text is inserted as plain text, a paragraph per line; a pasted image file goes to the
     * `addImageBlobHook` (unless the clipboard also has RTF, as Office documents put an image of the text on it).
     */
    private handlePaste(ev: ClipboardEvent) {
        const { clipboardData } = ev

        if (!clipboardData || !this.view.editable) {
            return false
        }

        const items = Array.from(clipboardData.items)
        const containRtfItem = items.some((item) => item.kind === 'string' && item.type === 'text/rtf')
        const imageBlob = containRtfItem ? null : pasteImageOnly(clipboardData.items)

        ev.preventDefault()

        if (imageBlob) {
            emitImageBlobHook(this.eventEmitter, imageBlob, ev.type)
        } else {
            this.replaceSelection(clipboardData.getData('text/plain'))
        }

        return true
    }

    createContext() {
        return {
            markdownDocument: this.markdownDocument,
            schema: this.schema,
            eventEmitter: this.eventEmitter
        }
    }

    createSpecs() {
        return new SpecManager([
            new Doc(),
            new Paragraph(),
            new TextNode(),
            new Heading(),
            new BlockQuote(),
            new CodeBlock(),
            new CustomBlock(),
            new Table(),
            new TableCell(),
            new ThematicBreak(),
            new ListItem(),
            new Strong(),
            new Strike(),
            new Emph(),
            new Code(),
            new Link(),
            new Delimiter(),
            new TaskDelimiter(),
            new MarkedText(),
            new Meta(),
            new Html()
        ])
    }

    createPlugins() {
        return [
            syntaxHighlight(this.context),
            previewHighlight(this.context),
            ...(this.cursorLineHighlight ? [cursorLineHighlight()] : []),
            smartTask(this.context),
            ...(this.autoDirection ? [autoDirection(isMarkdownAutoDirectionLine)] : []),
            ...(this.sourceWidgetRules.rules.length
                ? [widgetSource(this.markdownDocument, this.sourceWidgetRules, this.eventEmitter)]
                : []),
            ...this.createPluginProps()
        ].concat(this.defaultPlugins)
    }

    createView() {
        const editorView = new EditorView(this.el, {
            state: this.createState(),
            dispatchTransaction: (tr) => {
                this.updateMarkdown(tr)

                const { state } = this.view.state.applyTransaction(tr)

                this.view.updateState(state)
                this.emitChangeEvent(tr)
            },
            handleKeyDown: (_, ev) => {
                this.eventEmitter.emit('keydown', this.editorType, ev)

                // a keydown listener can prevent the default handling of the key
                return ev.defaultPrevented
            },
            handleDOMEvents: {
                paste: (_, ev) => this.handlePaste(ev),
                copy: (_, ev) => this.captureCopy(ev),
                // a read-only editor copies instead
                cut: (view, ev) => this.captureCopy(ev, view.editable ? EVENT_TYPE : undefined),
                scroll: () => {
                    this.eventEmitter.emit('scroll', 'editor')
                    return true
                },
                keyup: (_, ev: KeyboardEvent) => {
                    this.eventEmitter.emit('keyup', this.editorType, ev)
                    return false
                }
            }
        })

        editorView.dom.setAttribute('role', 'textbox')
        editorView.dom.setAttribute('aria-multiline', 'true')

        return editorView
    }

    createCommands() {
        return this.specs.commands(this.view)
    }

    private captureCopy(ev: ClipboardEvent, type?: string) {
        ev.preventDefault()

        const { selection, tr } = this.view.state

        if (selection.empty) {
            return true
        }

        const text = this.getChanged(selection.content())

        ev.clipboardData?.setData('text/plain', text)

        if (type === EVENT_TYPE) {
            this.view.dispatch(tr.deleteSelection().scrollIntoView().setMeta('uiEvent', EVENT_TYPE))
        }
        return true
    }

    private updateMarkdown(tr: Transaction) {
        if (tr.docChanged) {
            tr.steps.forEach((step, index) => {
                if (step instanceof ReplaceStep) {
                    const doc = tr.docs[index]
                    const [from, to] = [step.from, step.to]
                    const [startPos, endPos] = getEditorToMdPos(doc, from, to)
                    let changed = this.getChanged(step.slice)

                    if (startPos[0] === endPos[0] && startPos[1] === endPos[1] && changed === '') {
                        changed = '\n'
                    }
                    const editResult = this.markdownDocument.editMarkdown(startPos, endPos, changed)

                    this.eventEmitter.emit('updatePreview', editResult)

                    tr.setMeta('editResult', editResult).scrollIntoView()
                }
            })
        }
    }

    private getChanged(slice: Slice) {
        let changed = ''
        const from = 0
        const to = slice.content.size

        slice.content.nodesBetween(from, to, (node, pos) => {
            if (node.isText) {
                changed += node.text!.slice(Math.max(from, pos) - pos, to - pos)
            } else if (node.isBlock && pos > 0) {
                changed += '\n'
            }
        })

        return changed
    }

    setSelection(start: MdPos, end = start) {
        const { tr } = this.view.state
        const [from, to] = getMdToEditorPos(tr.doc, start, end)

        this.view.dispatch(tr.setSelection(createTextSelection(tr, from, to)).scrollIntoView())
    }

    moveCursorTo(line: number, focus = true) {
        const lineCount = this.view.state.doc.childCount
        const mdPos: MdPos = [Math.min(Math.max(line, 1), lineCount), 1]

        this.setSelection(mdPos, mdPos)

        if (focus) {
            this.focus()
        }
    }

    getCursorLine() {
        const { doc, selection } = this.view.state

        return getEditorToMdPos(doc, selection.from)[0][0]
    }

    replaceSelection(text: string, start?: MdPos, end?: MdPos) {
        let newTr
        const { tr, schema, doc } = this.view.state
        const lineTexts = text.split(reLineEnding)
        const nodes = lineTexts.map((lineText) =>
            createParagraph(schema, lineText)
        )
        const slice = new Slice(Fragment.from(nodes), 1, 1)

        this.focus()

        if (start && end) {
            const [from, to] = getMdToEditorPos(doc, start, end)

            newTr = tr.replaceRange(from, to, slice)
        } else {
            newTr = tr.replaceSelection(slice)
        }
        this.view.dispatch(newTr.scrollIntoView())
    }

    deleteSelection(start?: MdPos, end?: MdPos) {
        let newTr
        const { tr, doc } = this.view.state

        if (start && end) {
            const [from, to] = getMdToEditorPos(doc, start, end)

            newTr = tr.deleteRange(from, to)
        } else {
            newTr = tr.deleteSelection()
        }
        this.view.dispatch(newTr.scrollIntoView())
    }

    getSelectedText(start?: MdPos, end?: MdPos) {
        const { doc, selection } = this.view.state
        let { from, to } = selection

        if (start && end) {
            const pos = getMdToEditorPos(doc, start, end)

            from = pos[0]
            to = pos[1]
        }

        return doc.textBetween(from, to, '\n')
    }

    getSelection() {
        const { from, to } = this.view.state.selection

        return getEditorToMdPos(this.view.state.tr.doc, from, to)
    }

    setMarkdown(markdown: string, cursorToEnd = true, focus = true, addToHistory = true) {
        const lineTexts = markdown.split(reLineEnding)
        const { tr, doc, schema } = this.view.state
        const nodes = lineTexts.map((lineText) =>
            createParagraph(schema, lineText)
        )

        tr.replaceWith(0, doc.content.size, nodes)

        if (!addToHistory) {
            tr.setMeta('addToHistory', false)
        }

        this.view.dispatch(tr)

        if (cursorToEnd) {
            this.moveCursorToEnd(focus)
        }
    }

    addWidget(node: Node, style: WidgetStyle, mdPos?: MdPos) {
        const { tr, doc, selection } = this.view.state
        const pos = mdPos ? getMdToEditorPos(doc, mdPos, mdPos)[0] : selection.to

        this.view.dispatch(tr.setMeta('widget', { pos, node, style }))
    }

    replaceWithWidget(start: MdPos, end: MdPos, text: string) {
    // the markdown editor shows a widget's text, styled by the widget rules
        const { tr, doc } = this.view.state
        const [from, to] = getMdToEditorPos(doc, start, end)

        this.view.dispatch(tr.insertText(text, from, to))
    }

    getRangeInfoOfNode(pos?: MdPos) {
        const { doc, selection } = this.view.state
        const mdPos = pos || getEditorToMdPos(doc, selection.from)[0]
        let mdNode = this.markdownDocument.findNodeAtPosition(mdPos)!

        if (mdNode.type === 'text' && mdNode.parent!.type !== 'paragraph') {
            mdNode = mdNode.parent!
        }

        // add 1 sync for prosemirror position
        mdNode.sourcepos![1][1] += 1

        return { range: mdNode.sourcepos!, type: mdNode.type }
    }

    getMarkdown() {
        return this.markdownDocument.getLineTexts().join('\n')
    }

    getMarkdownDocument() {
        return this.markdownDocument
    }
}
