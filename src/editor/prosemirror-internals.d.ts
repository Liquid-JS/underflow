import 'prosemirror-model'

// members the editor uses that exist at runtime but aren't in ProseMirror's public types
declare module 'prosemirror-model' {
    interface Fragment {
        findIndex(pos: number, round?: number): { index: number, offset: number }
    }
}
