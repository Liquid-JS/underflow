import { Schema } from 'prosemirror-model'
import { EditorState, Plugin, Transaction } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap } from 'prosemirror-commands'
import { InputRule, inputRules } from 'prosemirror-inputrules'
import { history } from 'prosemirror-history'
import { Sourcepos } from '../parser/types/node'
import { WidgetStyle, EditorType, EditorPos, Base, NodeRangeInfo } from './types/editor'
import { Emitter } from './types/event'
import { Context, EditorAllCommandMap } from './types/spec'
import { PluginProp } from './types/plugin'
import { css } from './utils/native'
import { SpecManager } from './spec/spec-manager'
import { createTextSelection } from './helper/manipulation'
import { WidgetRules } from './widget/rules'
import { getDefaultCommands } from './commands/default-commands'
import { placeholder } from './plugins/placeholder'
import { addWidget } from './plugins/popup-widget'
import { dropImage } from './plugins/drop-image'

export abstract class EditorBase implements Base {
    el: HTMLElement

    editorType!: EditorType

    eventEmitter: Emitter

    context!: Context

    schema!: Schema

    keymaps!: Plugin[]

    view!: EditorView

    commands!: EditorAllCommandMap

    specs!: SpecManager

    placeholder: { text: string }

    extraPlugins!: PluginProp[]

    /** widgets typed in the editor become widget nodes; only the WYSIWYG editor has widget nodes */
    widgetRules?: WidgetRules

    constructor(eventEmitter: Emitter) {
        this.el = document.createElement('div')
        this.el.className = 'uf-editor'

        this.eventEmitter = eventEmitter
        this.placeholder = { text: '' }
    }

    abstract createSpecs(): SpecManager

    abstract createContext(): Context

    abstract createView(): EditorView

    createState() {
        return EditorState.create({
            schema: this.schema,
            plugins: this.createPlugins()
        })
    }

    protected initEvent() {
        const { eventEmitter, view, editorType } = this

        view.dom.addEventListener('focus', () => eventEmitter.emit('focus', editorType))
        view.dom.addEventListener('blur', () => eventEmitter.emit('blur', editorType))
    }

    protected emitChangeEvent(tr: Transaction) {
        this.eventEmitter.emit('caretChange', this.editorType)
        if (tr.docChanged) {
            this.eventEmitter.emit('change', this.editorType)
        }
    }

    get defaultPlugins() {
        const rules = this.createInputRules()
        const plugins = [
            ...this.keymaps,
            keymap({
                'Shift-Enter': baseKeymap.Enter,
                ...baseKeymap
            }),
            history(),
            placeholder(this.placeholder),
            addWidget(this.eventEmitter),
            dropImage(this.context)
        ]

        return rules ? plugins.concat(rules) : plugins
    }

    /** input rules besides the widgets' */
    protected createExtraInputRules(): InputRule[] {
        return []
    }

    private createInputRules() {
        const widgetRules = (this.widgetRules?.patterns ?? []).map(({ source, flags }, index) => {
            const baseFlags = flags.replace(/[gy]/g, '')
            const reMatchAtEnd = new RegExp(`(?:${source})$`, baseFlags)

            // Typed text becomes a widget once it's complete: when the next typed character doesn't
            // extend the match (like a space after `@name`), so `@n` doesn't become a widget too early.
            return new InputRule(
                new RegExp(`(${source})([^])$`, baseFlags),
                (state, match: RegExpMatchArray, start, end) => {
                    // the rule's own groups come after the first one
                    const text = match[1]
                    const typed = match[0].slice(text.length)

                    if (reMatchAtEnd.test(match.input!)) {
                        return null
                    }

                    const { widget } = state.schema.nodes
                    const tr = state.tr.replaceWith(
                        start,
                        start + text.length,
                        widget.create({ info: `widget${index}`, text })
                    )

                    return tr.insertText(typed, tr.mapping.map(end))
                }
            )
        })

        const rules = [...this.createExtraInputRules(), ...widgetRules]

        return rules.length ? inputRules({ rules }) : null
    }

    createSchema() {
        return new Schema({
            nodes: this.specs.nodes,
            marks: this.specs.marks
        })
    }

    createKeymaps(useCommandShortcut: boolean) {
        const { undo, redo } = getDefaultCommands()
        const allKeymaps = this.specs.keymaps(useCommandShortcut)
        const historyKeymap = {
            'Mod-z': undo(),
            'Shift-Mod-z': redo()
        }

        return useCommandShortcut ? allKeymaps.concat(keymap(historyKeymap)) : allKeymaps
    }

    createCommands() {
        return this.specs.commands(this.view)
    }

    createPluginProps() {
        return this.extraPlugins.map((plugin) => plugin(this.eventEmitter))
    }

    focus() {
        this.view.focus()
        this.view.dispatch(this.view.state.tr.scrollIntoView())
    }

    blur() {
        (this.view.dom as HTMLElement).blur()
    }

    destroy() {
        this.view.destroy()
        Object.keys(this).forEach((prop) => {
            delete this[prop as keyof this]
        })
    }

    moveCursorToStart(focus: boolean) {
        const { tr } = this.view.state

        this.view.dispatch(tr.setSelection(createTextSelection(tr, 1)).scrollIntoView())
        if (focus) {
            this.focus()
        }
    }

    moveCursorToEnd(focus: boolean) {
        const { tr } = this.view.state

        this.view.dispatch(
            tr.setSelection(createTextSelection(tr, tr.doc.content.size - 1)).scrollIntoView()
        )

        if (focus) {
            this.focus()
        }
    }

    setScrollTop(top: number) {
        this.view.dom.scrollTop = top
    }

    getScrollTop() {
        return this.view.dom.scrollTop
    }

    setPlaceholder(text: string) {
        this.placeholder.text = text
        this.view.dispatch(this.view.state.tr.scrollIntoView())
    }

    setHeight(height: number) {
        css(this.el, { height: `${height}px` })
    }

    setMinHeight(minHeight: number) {
        css(this.el, { minHeight: `${minHeight}px` })
    }

    getElement() {
        return this.el
    }

    abstract createPlugins(): Plugin[]

    abstract replaceWithWidget(start: EditorPos, end: EditorPos, text: string): void

    abstract addWidget(node: Node, style: WidgetStyle, pos?: EditorPos): void

    abstract setSelection(start?: EditorPos, end?: EditorPos): void

    abstract replaceSelection(text: string, start?: EditorPos, end?: EditorPos): void

    abstract deleteSelection(start?: EditorPos, end?: EditorPos): void

    abstract getSelectedText(start?: EditorPos, end?: EditorPos): string

    abstract getSelection(): Sourcepos | [number, number]

    abstract getRangeInfoOfNode(pos?: EditorPos): NodeRangeInfo

    abstract moveCursorTo(line: number, focus?: boolean): void

    abstract getCursorLine(): number
}
