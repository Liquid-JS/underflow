import type { Node, ResolvedPos } from 'prosemirror-model'
import { getSortedNumPair } from '../../utils/common'
import { findNodeBy } from './node'

export interface CellInfo {
    offset: number
    nodeSize: number
}
export interface SelectionInfo {
    startRowIdx: number
    startColIdx: number
    endRowIdx: number
    endColIdx: number
}

type RowInfo = CellInfo[]

const cache = new Map()

export class TableOffsetMap {
    private table: Node

    private tableRows: Node[]

    private tableStartPos: number

    private rowInfo: RowInfo[]

    constructor(table: Node, tableRows: Node[], tableStartPos: number, rowInfo: RowInfo[]) {
        this.table = table
        this.tableRows = tableRows
        this.tableStartPos = tableStartPos
        this.rowInfo = rowInfo
    }

    static create(cellPos: ResolvedPos): TableOffsetMap | null {
        const table = findNodeBy(cellPos, ({ type }: Node) => type.name === 'table')

        if (table) {
            const { node, depth, offset } = table
            const cached = cache.get(node)

            if (cached?.tableStartPos === offset + 1) {
                return cached
            }

            const rows: Node[] = []
            const tablePos = cellPos.start(depth)

            const thead = node.child(0)
            const tbody = node.child(1)

            const theadCellInfo = createOffsetMap(thead, tablePos)
            const tbodyCellInfo = createOffsetMap(tbody, tablePos + thead.nodeSize)

            thead.forEach((row) => rows.push(row))
            tbody.forEach((row) => rows.push(row))

            const map = new TableOffsetMap(node, rows, tablePos, theadCellInfo.concat(tbodyCellInfo))

            cache.set(node, map)

            return map
        }

        return null
    }

    get totalRowCount() {
        return this.rowInfo.length
    }

    get totalColumnCount() {
        return this.rowInfo[0].length
    }

    get tableStartOffset() {
        return this.tableStartPos
    }

    get tableEndOffset() {
        return this.tableStartPos + this.table.nodeSize - 1
    }

    getCellInfo(rowIdx: number, colIdx: number) {
        return this.rowInfo[rowIdx][colIdx]
    }

    posAt(rowIdx: number, colIdx: number): number {
        for (let i = 0, rowStart = this.tableStartPos; ; i += 1) {
            const rowEnd = rowStart + this.tableRows[i].nodeSize

            if (i === rowIdx) {
                return colIdx >= this.totalColumnCount ? rowEnd : this.rowInfo[i][colIdx].offset
            }
            rowStart = rowEnd
        }
    }

    getNodeAndPos(rowIdx: number, colIdx: number) {
        const cellInfo = this.rowInfo[rowIdx][colIdx]

        return {
            node: this.table.nodeAt(cellInfo.offset - this.tableStartOffset)!,
            pos: cellInfo.offset
        }
    }

    getCellIndex(cellPos: ResolvedPos): [rowIdx: number, colIdx: number] {
        for (let rowIdx = 0; rowIdx < this.totalRowCount; rowIdx += 1) {
            const rowInfo = this.rowInfo[rowIdx]

            for (let colIdx = 0; colIdx < this.totalColumnCount; colIdx += 1) {
                if (rowInfo[colIdx].offset + 1 > cellPos.pos) {
                    return [rowIdx, colIdx]
                }
            }
        }
        return [0, 0]
    }

    getRectOffsets(startCellPos: ResolvedPos, endCellPos = startCellPos) {
        if (startCellPos.pos > endCellPos.pos) {
            [startCellPos, endCellPos] = [endCellPos, startCellPos]
        }
        let [startRowIdx, startColIdx] = this.getCellIndex(startCellPos)
        let [endRowIdx, endColIdx] = this.getCellIndex(endCellPos);

        [startRowIdx, endRowIdx] = getSortedNumPair(startRowIdx, endRowIdx);
        [startColIdx, endColIdx] = getSortedNumPair(startColIdx, endColIdx)

        return { startRowIdx, startColIdx, endRowIdx, endColIdx }
    }
}

function createOffsetMap(headOrBody: Node, startOffset: number) {
    const cellInfoMatrix: RowInfo[] = []

    headOrBody.forEach((row: Node, rowOffset: number) => {
        const rowInfo: RowInfo = []

        row.forEach(({ nodeSize }: Node, cellOffset: number) => {
            rowInfo.push({
                // 2 is the sum of the front and back positions of the tag
                offset: startOffset + rowOffset + cellOffset + 2,
                nodeSize
            })
        })
        cellInfoMatrix.push(rowInfo)
    })

    return cellInfoMatrix
}
