import type { EditorCore } from '../editor-core'

type QueryFn = (editor: EditorCore, payload?: Record<string, any>) => any

const queryMap: Record<string, QueryFn> = {
    getPopupInitialValues: (editor, payload) => {
        const { popupName } = payload!

        return popupName === 'link' ? { linkText: editor.getSelectedText() } : {}
    }
}

export function buildQuery(editor: EditorCore) {
    editor.eventEmitter.listen('query', (query: string, payload?: Record<string, any>) =>
        queryMap[query](editor, payload)
    )
}
