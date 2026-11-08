import { Emitter, EventName, EventTypes, Handler } from '../types/event'
import { isFalsy, isUndefined } from '../utils/native'

const eventTypeList: EventTypes[] = [
    'afterPreviewRender',
    'updatePreview',
    'changeMode',
    'changeTheme',
    'changeReadonly',
    'changeDisabled',
    'needChangeMode',
    'command',
    'changePreviewStyle',
    'changePreviewTabPreview',
    'changePreviewTabWrite',
    'scroll',
    'contextmenu',
    'show',
    'hide',
    'changeLanguage',
    'changeToolbarState',
    'toggleScrollSync',
    'setFocusedNode',
    'removePopupWidget',
    'query',
    // provide event for user
    'openPopup',
    'closePopup',
    'addImageBlobHook',
    'beforePreviewRender',
    'beforeConvertWysiwygToMarkdown',
    'load',
    'loadUI',
    'change',
    'caretChange',
    'destroy',
    'focus',
    'blur',
    'keydown',
    'keyup',
    'clickWidget'
]

class EventEmitter implements Emitter {
    private events: Map<string, Handler[] | undefined>

    private eventTypes: Record<string, string>

    private hold: boolean

    constructor() {
        this.events = new Map()
        this.eventTypes = eventTypeList.reduce((types, type) => ({ ...types, type }), {})
        this.hold = false

        eventTypeList.forEach((eventType) => {
            this.addEventType(eventType)
        })
    }

    listen(type: EventName, handler: Handler) {
        const typeInfo = this.getTypeInfo(type)
        const eventHandlers = this.events.get(typeInfo.type) || []

        if (!this.hasEventType(typeInfo.type)) {
            throw new Error(`There is no event type ${typeInfo.type}`)
        }

        if (typeInfo.namespace) {
            handler.namespace = typeInfo.namespace
        }

        eventHandlers.push(handler)

        this.events.set(typeInfo.type, eventHandlers)
    }

    /** Calls the handlers and returns what they return, except `undefined`. */
    emit(type: string, ...args: any[]) {
        const typeInfo = this.getTypeInfo(type)
        const eventHandlers = this.events.get(typeInfo.type)
        const results: any[] = []

        if (!this.hold && eventHandlers) {
            eventHandlers.forEach((handler) => {
                const result = handler(...args)

                if (!isUndefined(result)) {
                    results.push(result)
                }
            })
        }

        return results
    }

    /** Passes `source` through the handlers, each getting what the previous one returned. */
    emitReduce(type: string, source: any, ...args: any[]) {
        const eventHandlers = this.events.get(type)

        if (!this.hold && eventHandlers) {
            eventHandlers.forEach((handler) => {
                const result = handler(source, ...args)

                if (!isFalsy(result)) {
                    source = result
                }
            })
        }

        return source
    }

    /** `type.namespace` */
    private getTypeInfo(type: string) {
        const splited = type.split('.')

        return {
            type: splited[0],
            namespace: splited[1]
        }
    }

    private hasEventType(type: string) {
        return !isUndefined(this.eventTypes[this.getTypeInfo(type).type])
    }

    addEventType(type: string) {
        if (this.hasEventType(type)) {
            throw new Error(`There is already have event type ${type}`)
        }

        this.eventTypes[type] = type
    }

    /** Removes the handler, or all the handlers of the event; `type.namespace` removes the namespace's handlers. */
    removeEventHandler(eventType: string, handler?: Handler) {
        const { type, namespace } = this.getTypeInfo(eventType)

        if (type && handler) {
            this.removeEventHandlerWithHandler(type, handler)
        } else if (type && !namespace) {
            this.events.delete(type)
        } else if (!type && namespace) {
            this.events.forEach((_, evtType) => {
                this.removeEventHandlerWithTypeInfo(evtType, namespace)
            })
        } else if (type && namespace) {
            this.removeEventHandlerWithTypeInfo(type, namespace)
        }
    }

    private removeEventHandlerWithHandler(type: string, handler: Handler) {
        const eventHandlers = this.events.get(type)

        if (eventHandlers) {
            const handlerIndex = eventHandlers.indexOf(handler)

            if (eventHandlers.indexOf(handler) >= 0) {
                eventHandlers.splice(handlerIndex, 1)
            }
        }
    }

    private removeEventHandlerWithTypeInfo(type: string, namespace: string) {
        const handlersToSurvive: Handler[] = []
        const eventHandlers = this.events.get(type)

        if (!eventHandlers) {
            return
        }

        eventHandlers.map((handler: Handler) => {
            if (handler.namespace !== namespace) {
                handlersToSurvive.push(handler)
            }

            return null
        })

        this.events.set(type, handlersToSurvive)
    }

    getEvents() {
        return this.events
    }

    holdEventInvoke(fn: () => void) {
        this.hold = true
        fn()
        this.hold = false
    }
}

export { EventEmitter }
