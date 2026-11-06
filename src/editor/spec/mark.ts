import type { Command } from 'prosemirror-state'
import { MarkSpec } from 'prosemirror-model'
import { SpecContext, EditorCommand, EditorCommandMap } from '../types/spec'

export abstract class Mark {
    context!: SpecContext

    get type() {
        return 'mark'
    }

    setContext(context: SpecContext) {
        this.context = context
    }

    abstract get name(): string

    abstract get schema(): MarkSpec

    commands?(): EditorCommand | EditorCommandMap

    keymaps?(): Record<string, Command>
}
