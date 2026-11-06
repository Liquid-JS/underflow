import { MdNodeType } from '../../types/node'
import { Process, BlockHandler } from '../block-handlers'

export const table: BlockHandler = {
    continue: () => Process.Go,
    finalize: () => {},
    canContain: (t: MdNodeType) => t === 'tableHead' || t === 'tableBody',
    acceptsLines: false
}

export const tableBody: BlockHandler = {
    continue: () => Process.Go,
    finalize: () => {},
    canContain: (t: MdNodeType) => t === 'tableRow',
    acceptsLines: false
}

export const tableHead: BlockHandler = {
    continue: () => Process.Stop,
    finalize: () => {},
    canContain: (t: MdNodeType) => t === 'tableRow' || t === 'tableDelimRow',
    acceptsLines: false
}

export const tableDelimRow: BlockHandler = {
    continue: () => Process.Stop,
    finalize: () => {},
    canContain: (t: MdNodeType) => t === 'tableDelimCell',
    acceptsLines: false
}

export const tableDelimCell: BlockHandler = {
    continue: () => Process.Stop,
    finalize: () => {},
    canContain: () => false,
    acceptsLines: false
}

export const tableRow: BlockHandler = {
    continue: () => Process.Stop,
    finalize: () => {},
    canContain: (t: MdNodeType) => t === 'tableCell',
    acceptsLines: false
}

export const tableCell: BlockHandler = {
    continue: () => Process.Stop,
    finalize: () => {},
    canContain: () => false,
    acceptsLines: false
}
