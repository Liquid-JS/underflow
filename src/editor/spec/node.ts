import type { Command } from 'prosemirror-state'
import { NodeSpec } from 'prosemirror-model'
import { SpecContext, EditorCommand, EditorCommandMap } from '../types/spec'

export abstract class NodeSchema {
    context!: SpecContext

    get type() {
        return 'node'
    }

    setContext(context: SpecContext) {
        this.context = context
    }

    abstract get name(): string

    abstract get schema(): NodeSpec

    commands?(): EditorCommand | EditorCommandMap

    keymaps?(): Record<string, Command>
}
