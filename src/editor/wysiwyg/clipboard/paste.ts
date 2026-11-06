import { Schema, Node, Slice, Fragment, NodeType } from 'prosemirror-model'

import { getTableContentFromSlice } from '../helper/table'
import { ALTERNATIVE_TAG_FOR_BR } from '../../utils/constants'
import { splitTableCellSpansInHTML } from '../helper/table-spans'
import { isFromMso, convertMsoParagraphsToList } from './paste-mso-list'

const START_FRAGMENT_COMMENT = '<!--StartFragment-->'
const END_FRAGMENT_COMMENT = '<!--EndFragment-->'

function getContentBetweenFragmentComments(html: string) {
    const startFragmentIndex = html.indexOf(START_FRAGMENT_COMMENT)
    const endFragmentIndex = html.lastIndexOf(END_FRAGMENT_COMMENT)

    if (startFragmentIndex > -1 && endFragmentIndex > -1) {
        html = html.slice(startFragmentIndex + START_FRAGMENT_COMMENT.length, endFragmentIndex)
    }

    return html.replace(/<br[^>]*>/g, ALTERNATIVE_TAG_FOR_BR)
}

function convertMsoTableToCompletedTable(html: string) {
    // wrap with <tr> if html contains dangling <td> tags
    // dangling <td> tag is that tag does not have <tr> as parent node
    if (/<\/td>((?!<\/tr>)[\s\S])*$/i.test(html)) {
        html = `<tr>${html}</tr>`
    }
    // wrap with <table> if html contains dangling <tr> tags
    // dangling <tr> tag is that tag does not have <table> as parent node
    if (/<\/tr>((?!<\/table>)[\s\S])*$/i.test(html)) {
        html = `<table>${html}</table>`
    }

    return html
}

function removeInlineStyles(html: string) {
    const container = document.createElement('div')

    container.innerHTML = html

    Array.from(container.querySelectorAll('[style]')).forEach((el) => el.removeAttribute('style'))

    // unwrap the elements that were only used for styling
    Array.from(container.querySelectorAll('span, font')).forEach((el) => {
        if (!el.attributes.length) {
            while (el.firstChild) {
                el.parentNode!.insertBefore(el.firstChild, el)
            }
            el.parentNode!.removeChild(el)
        }
    })

    return container.innerHTML
}

export function changePastedHTML(html: string, stripStyles = false) {
    html = getContentBetweenFragmentComments(html)
    html = convertMsoTableToCompletedTable(html)
    html = splitTableCellSpansInHTML(html)

    if (isFromMso(html)) {
        html = convertMsoParagraphsToList(html)
    }

    if (stripStyles) {
        html = removeInlineStyles(html)
    }

    return html
}

function getMaxColumnCount(rows: Node[]) {
    const row = rows.reduce((prevRow, currentRow) =>
        prevRow.childCount > currentRow.childCount ? prevRow : currentRow
    )

    return row.childCount
}

// copies the row's cells, and fills it up with empty cells to the widest row's count
function createCells(orgRow: Node, maxColumnCount: number, cell: NodeType) {
    const cells = []
    const cellCount = orgRow.childCount

    for (let colIdx = 0; colIdx < Math.max(cellCount, maxColumnCount); colIdx += 1) {
        if (colIdx >= cellCount) {
            cells.push(cell.createAndFill()!)
        } else {
            cells.push(cell.create(orgRow.child(colIdx).attrs, orgRow.child(colIdx).content))
        }
    }

    return cells
}

export function copyTableHeadRow(orgRow: Node, maxColumnCount: number, schema: Schema) {
    const { tableRow, tableHeadCell } = schema.nodes
    const cells = createCells(orgRow, maxColumnCount, tableHeadCell)

    return tableRow.create(null, cells)
}

export function copyTableBodyRow(orgRow: Node, maxColumnCount: number, schema: Schema) {
    const { tableRow, tableBodyCell } = schema.nodes
    const cells = createCells(orgRow, maxColumnCount, tableBodyCell)

    return tableRow.create(null, cells)
}

function creatTableBodyDummyRow(columnCount: number, schema: Schema) {
    const { tableRow, tableBodyCell } = schema.nodes
    const cells = []

    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
        const dummyCell = tableBodyCell.createAndFill()!

        cells.push(dummyCell)
    }

    return tableRow.create({ dummyRowForPasting: true }, cells)
}

export function createRowsFromPastingTable(tableContent: Fragment) {
    const tableHeadRows: Node[] = []
    const tableBodyRows: Node[] = []

    if (tableContent.firstChild!.type.name === 'tableHead') {
        const tableHead = tableContent.firstChild!

        tableHead.forEach((row) => tableHeadRows.push(row))
    }

    if (tableContent.lastChild!.type.name === 'tableBody') {
        const tableBody = tableContent.lastChild!

        tableBody.forEach((row) => tableBodyRows.push(row))
    }

    return [...tableHeadRows, ...tableBodyRows]
}

function createTableHead(tableHeadRow: Node, maxColumnCount: number, schema: Schema) {
    const copiedRow = copyTableHeadRow(tableHeadRow, maxColumnCount, schema)

    return schema.nodes.tableHead.create(null, copiedRow)
}

function createTableBody(tableBodyRows: Node[], maxColumnCount: number, schema: Schema) {
    const copiedRows = tableBodyRows.map((tableBodyRow) =>
        copyTableBodyRow(tableBodyRow, maxColumnCount, schema)
    )

    if (!tableBodyRows.length) {
        const dummyTableRow = creatTableBodyDummyRow(maxColumnCount, schema)

        copiedRows.push(dummyTableRow)
    }

    return schema.nodes.tableBody.create(null, copiedRows)
}

function createTableFromPastingTable(
    rows: Node[],
    schema: Schema,
    startFromBody: boolean,
    isInTable: boolean
) {
    const columnCount = getMaxColumnCount(rows)

    if (startFromBody && isInTable) {
        return schema.nodes.table.create(null, [createTableBody(rows, columnCount, schema)])
    }

    const [tableHeadRow] = rows
    const tableBodyRows = rows.slice(1)

    const nodes = [createTableHead(tableHeadRow, columnCount, schema)]

    if (tableBodyRows.length) {
        nodes.push(createTableBody(tableBodyRows, columnCount, schema))
    }

    return schema.nodes.table.create(null, nodes)
}

export function changePastedSlice(slice: Slice, schema: Schema, isInTable: boolean) {
    const nodes: Node[] = []
    const { content, openStart, openEnd } = slice

    content.forEach((node) => {
        if (node.type.name === 'table') {
            const tableContent = getTableContentFromSlice(new Slice(Fragment.from(node), 0, 0))

            if (tableContent) {
                const rows = createRowsFromPastingTable(tableContent)
                const startFromBody = tableContent.firstChild!.type.name === 'tableBody'
                const table = createTableFromPastingTable(rows, schema, startFromBody, isInTable)

                nodes.push(table)
            }
        } else {
            nodes.push(node)
        }
    })

    return new Slice(Fragment.from(nodes), openStart, openEnd)
}
