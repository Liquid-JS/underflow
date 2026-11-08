export interface Handler {
    (...args: any[]): any
    namespace?: string
}

// built-in event names are suggested, custom ones registered with `addEventType` are still allowed
export type EventName = EventTypes | (string & {})

export interface Emitter {
    listen(type: EventName, handler: Handler): void
    emit(type: string, ...args: any[]): any[]
    emitReduce(type: string, source: any, ...args: any[]): any
    addEventType(type: string): void
    removeEventHandler(type: string, handler?: Handler): void
    getEvents(): Map<string, Handler[] | undefined>
    holdEventInvoke(fn: () => void): void
}

export type EmitterConstructor = new () => Emitter

export type EventTypes =
  | 'afterPreviewRender'
  | 'updatePreview'
  | 'changeMode'
  | 'changeTheme'
  | 'changeReadonly'
  | 'needChangeMode'
  | 'command'
  | 'changePreviewStyle'
  | 'changePreviewTabPreview'
  | 'changePreviewTabWrite'
  | 'scroll'
  | 'contextmenu'
  | 'show'
  | 'hide'
  | 'changeLanguage'
  | 'changeToolbarState'
  | 'toggleScrollSync'
  | 'setFocusedNode'
  | 'removePopupWidget'
  | 'query'
  // provide event for user
  | 'openPopup'
  | 'closePopup'
  | 'addImageBlobHook'
  | 'beforePreviewRender'
  | 'beforeConvertWysiwygToMarkdown'
  | 'clickWidget'
  | 'load'
  | 'loadUI'
  | 'change'
  | 'caretChange'
  | 'destroy'
  | 'focus'
  | 'blur'
  | 'keydown'
  | 'keyup'
