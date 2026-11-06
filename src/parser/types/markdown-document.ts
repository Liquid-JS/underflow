import { MdNode } from './node'

export interface RemovedNodeRange {
    id: [number, number]
    line: [number, number]
}

export interface EditResult {
    nodes: MdNode[]
    removedNodeRange: RemovedNodeRange | null
}

export type EventName = 'change'

export type EventHandlerMap = {
    [key in EventName]: Array<(param: any) => void>
}
