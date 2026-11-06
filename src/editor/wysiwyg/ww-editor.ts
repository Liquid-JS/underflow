import { EditorView, NodeView } from 'prosemirror-view'
import { Node as ProsemirrorNode, Slice, Fragment, Mark, Schema } from 'prosemirror-model'
import { Selection } from 'prosemirror-state'

import { keymap } from 'prosemirror-keymap'
import { undoInputRule } from 'prosemirror-inputrules'
import { Emitter } from '../types/event'
import { ToDOMAdaptor } from '../types/convertor'
import { EditPanelOptions, HTMLSchemaMap, LinkAttributes, WidgetStyle } from '../types/editor'
import { NodeViewPropMap, PluginProp } from '../types/plugin'
import { EditorBase } from '../base'
import { getWwCommands } from '../commands/ww-commands'

import { createParagraph, createTextSelection } from '../helper/manipulation'
import { emitImageBlobHook, pasteImageOnly } from '../helper/image'

import { WidgetRules } from '../widget/rules'
import { createWidgetNodeView } from '../widget/widget-node'
import { cls, removeProseMirrorHackNodes } from '../utils/dom'
import { isNumber } from '../utils/native'
import { markdownShortcutRules } from './plugins/markdown-shortcuts'
import { isInTableNode } from './helper/node'
import { tableSelection } from './plugins/selection/table-selection'
import { tableContextMenu } from './plugins/table-context-menu'
import { task } from './plugins/task'
import { toolbarStateHighlight } from './plugins/toolbar-state'
import { linkEditPanel } from './plugins/link-edit-panel'
import { imageEditPanel } from './plugins/image-edit-panel'
import { tableEditPanel } from './plugins/table-edit-panel'

import { CustomBlockView } from './nodeview/custom-block-view'
import { ImageView } from './nodeview/image-view'
import { CodeBlockView } from './nodeview/code-block-view'

import { changePastedHTML, changePastedSlice } from './clipboard/paste'
import { DataImage, takeDataImages } from './clipboard/data-images'
import { dropOnEmptyBlock } from './clipboard/drop'
import { pasteToTable } from './clipboard/paste-to-table'
import { createSpecs } from './spec-creator'

interface WysiwygOptions {
    toDOMAdaptor: ToDOMAdaptor
    useCommandShortcut?: boolean
    htmlSchemaMap?: HTMLSchemaMap
    linkAttributes?: LinkAttributes | null
    wwPlugins?: PluginProp[]
    wwNodeViews?: NodeViewPropMap
    stripPastedStyles?: boolean
    editPanel?: EditPanelOptions
    widgetRules?: WidgetRules
}

type PluginNodeVeiwFn = (node: ProsemirrorNode, view: EditorView, getPos: () => number) => NodeView

interface PluginNodeViews {
    [k: string]: PluginNodeVeiwFn
}

const CONTENTS_CLASS_NAME = cls('contents')

interface LineInfo {
    line: number
    start: number
}

export class WysiwygEditor extends EditorBase {
    private toDOMAdaptor: ToDOMAdaptor

    private linkAttributes: LinkAttributes

    private pluginNodeViews: NodeViewPropMap

    private stripPastedStyles: boolean

    /** the paste or drop being handled, and whether its content comes from a ProseMirror editor */
    private pasteSource: { type: string, internal: boolean } | null = null

    private editPanelOptions: EditPanelOptions

    declare widgetRules: WidgetRules

    constructor(eventEmitter: Emitter, options: WysiwygOptions) {
        super(eventEmitter)

        const {
            toDOMAdaptor,
            htmlSchemaMap = {} as HTMLSchemaMap,
            linkAttributes = {},
            useCommandShortcut = true,
            wwPlugins = [],
            wwNodeViews = {},
            stripPastedStyles = false,
            editPanel = {},
            widgetRules = new WidgetRules()
        } = options

        this.editorType = 'wysiwyg'
        this.el.classList.add('ww-mode')
        this.toDOMAdaptor = toDOMAdaptor
        this.linkAttributes = linkAttributes!
        this.extraPlugins = wwPlugins
        this.pluginNodeViews = wwNodeViews
        this.stripPastedStyles = stripPastedStyles
        this.editPanelOptions = editPanel
        this.widgetRules = widgetRules
        this.specs = this.createSpecs()
        this.schema = this.createSchema(htmlSchemaMap)
        this.context = this.createContext()
        this.keymaps = this.createKeymaps(useCommandShortcut)
        this.view = this.createView()
        this.commands = this.createCommands()
        this.specs.setContext({ ...this.context, view: this.view })
        this.initEvent()
    }

    createSpecs() {
        return createSpecs(this.linkAttributes, this.widgetRules)
    }

    createContext() {
        return {
            schema: this.schema,
            eventEmitter: this.eventEmitter
        }
    }

    createSchema(htmlSchemaMap?: HTMLSchemaMap) {
        return new Schema({
            nodes: { ...this.specs.nodes, ...htmlSchemaMap!.nodes },
            marks: { ...this.specs.marks, ...htmlSchemaMap!.marks }
        })
    }

    createPlugins() {
        const {
            useLinkEditPanel = true,
            useImageEditPanel = true,
            useTableEditPanel = true
        } = this.editPanelOptions

        return [
            // Backspace right after a markdown shortcut or a widget was applied undoes it
            keymap({ Backspace: undoInputRule }),
            tableSelection(),
            tableContextMenu(this.eventEmitter),
            task(),
            toolbarStateHighlight(this.eventEmitter),
            ...(useLinkEditPanel ? [linkEditPanel(this.eventEmitter)] : []),
            ...(useImageEditPanel ? [imageEditPanel(this.eventEmitter)] : []),
            ...(useTableEditPanel ? [tableEditPanel(this.eventEmitter)] : []),
            ...this.createPluginProps()
        ].concat(this.defaultPlugins)
    }

    protected createExtraInputRules() {
        return markdownShortcutRules(this.schema)
    }

    createPluginNodeViews() {
        const { eventEmitter, pluginNodeViews } = this
        const pluginNodeViewMap: PluginNodeViews = {}

        if (pluginNodeViews) {
            Object.keys(pluginNodeViews).forEach((key) => {
                pluginNodeViewMap[key] = (node, view, getPos) =>
                    pluginNodeViews[key](node, view, getPos, eventEmitter)
            })
        }

        return pluginNodeViewMap
    }

    createView() {
        const { toDOMAdaptor, eventEmitter } = this

        const editorView = new EditorView(this.el, {
            state: this.createState(),
            attributes: {
                class: CONTENTS_CLASS_NAME
            },
            nodeViews: {
                customBlock: (node, view, getPos) => new CustomBlockView(node, view, getPos as () => number, toDOMAdaptor),
                image: (node, view, getPos) => new ImageView(node, view, getPos as () => number, eventEmitter),
                codeBlock: (node, view, getPos) => new CodeBlockView(node, view, getPos as () => number, eventEmitter),
                widget: createWidgetNodeView(this.widgetRules),
                ...this.createPluginNodeViews()
            },
            dispatchTransaction: (tr) => {
                const { state } = this.view.state.applyTransaction(tr)

                this.view.updateState(state)
                this.emitChangeEvent(tr.scrollIntoView())
                this.eventEmitter.emit('setFocusedNode', state.selection.$from.node(1))
            },
            transformPastedHTML: (html: string) => changePastedHTML(html, this.stripPastedStyles),
            // every line of pasted text is a paragraph, empty lines too, as when typing them
            clipboardTextParser: (text, $context) => {
                const { schema } = this.view.state
                const marks = $context.marks()
                const paragraphs = text.split(/\r\n?|\n/).map((line) =>
                    schema.nodes.paragraph.create(
                        null,
                        this.widgetRules.createNodes(line, schema).map((node) => node.mark(marks))
                    )
                )

                return new Slice(Fragment.from(paragraphs), 1, 1)
            },
            transformPasted: (slice: Slice, view: EditorView) => {
                const changed = changePastedSlice(
                    slice,
                    this.schema,
                    isInTableNode(this.view.state.selection.$from)
                )
                const source = this.pasteSource

                this.pasteSource = null
                // content moved or copied within the editor keeps its images
                if (!source || source.internal || view.dragging) {
                    return changed
                }

                const { slice: rest, images } = takeDataImages(changed)

                if (images.length) {
                    this.addDataImages(images, source.type)
                }

                return rest
            },
            handlePaste: (view: EditorView, _: ClipboardEvent, slice: Slice) => pasteToTable(view, slice),
            handleDrop: (view, ev, slice, moved) => dropOnEmptyBlock(view, ev, slice, moved),
            handleKeyDown: (_, ev) => {
                this.eventEmitter.emit('keydown', this.editorType, ev)

                // a keydown listener can prevent the default handling of the key
                return ev.defaultPrevented
            },
            handleDOMEvents: {
                paste: (_, ev) => {
                    const { clipboardData } = ev as ClipboardEvent
                    const items = clipboardData?.items

                    this.pasteSource = {
                        type: ev.type,
                        internal: /data-pm-slice/.test(clipboardData?.getData('text/html') ?? '')
                    }

                    if (items) {
                        const containRtfItem = Array.from(items).some(
                            (item) => item.kind === 'string' && item.type === 'text/rtf'
                        )

                        // if it contains rtf, it's most likely copy paste from office -> no image
                        if (!containRtfItem) {
                            const imageBlob = pasteImageOnly(items)

                            if (imageBlob) {
                                ev.preventDefault()

                                emitImageBlobHook(this.eventEmitter, imageBlob, ev.type)
                            }
                        }
                    }
                    return false
                },
                drop: (_, ev) => {
                    this.pasteSource = { type: ev.type, internal: false }

                    return false
                },
                keyup: (_, ev: KeyboardEvent) => {
                    this.eventEmitter.emit('keyup', this.editorType, ev)
                    return false
                },
                scroll: () => {
                    this.eventEmitter.emit('scroll', 'editor')
                    return true
                }
            }
        })

        editorView.dom.setAttribute('role', 'textbox')
        editorView.dom.setAttribute('aria-multiline', 'true')

        return editorView
    }

    /**
     * Images with a `data:` URL taken out of pasted or dropped content go to the `addImageBlobHook`
     * after the content is inserted; dropped content is selected then, so they go after it.
     */
    private addDataImages(images: DataImage[], type: string) {
        queueMicrotask(() => {
            if (!this.view) {
                return
            }

            const { state } = this.view

            if (type === 'drop' && !state.selection.empty) {
                this.view.dispatch(
                    state.tr.setSelection(Selection.near(state.doc.resolve(state.selection.to), -1))
                )
            }
            images.forEach(({ file, altText }) =>
                emitImageBlobHook(this.eventEmitter, file, type, altText)
            )
        })
    }

    createCommands() {
        return this.specs.commands(this.view, getWwCommands())
    }

    /** the document's HTML, without the editor's own controls: code block language labels and icons */
    getHTML() {
        const dom = this.view.dom.cloneNode(true) as HTMLElement
        const controls = [cls('code-block-label'), cls('image-link-button'), cls('icon')]

        dom.querySelectorAll(controls.map((name) => `.${name}`).join(', ')).forEach((el) => el.remove())

        return removeProseMirrorHackNodes(dom.innerHTML)
    }

    getModel() {
        return this.view.state.doc
    }

    getSelection(): [number, number] {
        const { from, to } = this.view.state.selection

        return [from, to]
    }

    getSchema() {
        return this.view.state.schema
    }

    replaceSelection(text: string, start?: number, end?: number) {
        const { schema, tr } = this.view.state
        const lineTexts = text.split('\n')
        const paras = lineTexts.map((lineText) =>
            createParagraph(schema, this.widgetRules.createNodes(lineText, schema))
        )
        const slice = new Slice(Fragment.from(paras), 1, 1)
        const newTr =
            isNumber(start) && isNumber(end)
                ? tr.replaceRange(start, end, slice)
                : tr.replaceSelection(slice)

        this.view.dispatch(newTr)
        this.focus()
    }

    deleteSelection(start?: number, end?: number) {
        const { tr } = this.view.state
        const newTr =
            isNumber(start) && isNumber(end) ? tr.deleteRange(start, end) : tr.deleteSelection()

        this.view.dispatch(newTr.scrollIntoView())
    }

    getSelectedText(start?: number, end?: number) {
        const { doc, selection } = this.view.state
        let { from, to } = selection

        if (isNumber(start) && isNumber(end)) {
            from = start
            to = end
        }
        return doc.textBetween(from, to, '\n')
    }

    setModel(newDoc: ProsemirrorNode | [], cursorToEnd = false, focus = true, addToHistory = true) {
        const { tr, doc } = this.view.state

        tr.replaceWith(0, doc.content.size, newDoc)

        if (!addToHistory) {
            tr.setMeta('addToHistory', false)
        }

        this.view.dispatch(tr)

        if (cursorToEnd) {
            this.moveCursorToEnd(focus)
        }
    }

    setSelection(start: number, end = start) {
        const { tr } = this.view.state
        const selection = createTextSelection(tr, start, end)

        this.view.dispatch(tr.setSelection(selection).scrollIntoView())
    }

    /**
     * Iterates the "lines" of the document: every textblock, every table row and
     * every line of a code block is a line. `start` is the first cursor position of the line.
     */
    private iterateLines(visitor: (info: LineInfo) => boolean | void) {
        const { doc } = this.view.state
        let line = 0

        const visit = (info: LineInfo) => {
            line += 1
            return !!visitor(info)
        }

        const traverse = (node: ProsemirrorNode, pos: number): boolean => {
            const { name } = node.type

            if (name === 'tableRow') {
                const found = Selection.findFrom(doc.resolve(pos + 1), 1, true)

                return visit({ line: line + 1, start: found ? found.from : pos + 1 })
            }

            if (name === 'codeBlock') {
                let offset = 0

                return node.textContent.split('\n').some((lineText) => {
                    const start = pos + 1 + offset

                    offset += lineText.length + 1
                    return visit({ line: line + 1, start })
                })
            }

            if (node.isTextblock) {
                return visit({ line: line + 1, start: pos + 1 })
            }

            let childPos = pos + 1

            for (let i = 0; i < node.childCount; i += 1) {
                const child = node.child(i)

                if (traverse(child, childPos)) {
                    return true
                }
                childPos += child.nodeSize
            }

            return false
        }

        // the document node itself starts before the first position
        traverse(doc, -1)
    }

    moveCursorTo(line: number, focus = true) {
        let targetPos = -1

        this.iterateLines((info) => {
            targetPos = info.start

            return info.line >= line
        })

        if (targetPos >= 0) {
            this.setSelection(targetPos, targetPos)

            if (focus) {
                this.focus()
            }
        }
    }

    getCursorLine() {
        const { from } = this.view.state.selection
        let cursorLine = 1

        this.iterateLines(({ line, start }) => {
            if (start > from) {
                return true
            }
            cursorLine = line

            return false
        })

        return cursorLine
    }

    addWidget(node: Node, style: WidgetStyle, pos?: number) {
        const { dispatch, state } = this.view

        dispatch(state.tr.setMeta('widget', { pos: pos ?? state.selection.to, node, style }))
    }

    replaceWithWidget(start: number, end: number, text: string) {
        const { tr, schema } = this.view.state
        const nodes = this.widgetRules.createNodes(text, schema)

        this.view.dispatch(tr.replaceWith(start, end, nodes))
    }

    getRangeInfoOfNode(pos?: number) {
        const { doc, selection } = this.view.state
        const $pos = pos ? doc.resolve(pos) : selection.$from
        const marks = $pos.marks()
        const node = $pos.node()
        let start = $pos.start()
        let end = $pos.end()
        let type = node.type.name

        if (marks.length || type === 'paragraph') {
            const mark = marks[marks.length - 1]
            const maybeHasMark = (nodeMarks: Mark[]) =>
                nodeMarks.length ? nodeMarks.includes(mark) : true

            type = mark ? mark.type.name : 'text'

            node.forEach((child, offset) => {
                const { isText, nodeSize, marks: nodeMarks } = child
                const startOffset = $pos.pos - start

                if (
                    isText &&
          offset <= startOffset &&
          offset + nodeSize >= startOffset &&
          maybeHasMark(nodeMarks as Mark[])
                ) {
                    start = start + offset
                    end = start + nodeSize
                }
            })
        }
        return { range: [start, end] as [number, number], type }
    }
}
