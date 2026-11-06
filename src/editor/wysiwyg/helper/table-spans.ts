// a cell can't span more columns than this (the HTML limit)
const MAX_COLSPAN = 1000

const reSpan = /\b(?:col|row)span\s*=/i

function createEmptyCell(cell: HTMLTableCellElement) {
    return cell.ownerDocument.createElement(cell.localName)
}

function splitRowGroupSpans(rows: HTMLCollectionOf<HTMLTableRowElement>) {
    // the column a merged cell still covers, and the cell, for each row it still spans
    const spanning = new Map<number, { cell: HTMLTableCellElement, rowCount: number }>()

    Array.from(rows).forEach((row, rowIdx) => {
        let colIdx = 0

        // fills the columns that merged cells from rows above cover
        const fillSpannedColumns = (before: Node | null) => {
            while (spanning.has(colIdx)) {
                const span = spanning.get(colIdx)!

                row.insertBefore(createEmptyCell(span.cell), before)
                span.rowCount -= 1
                if (!span.rowCount) {
                    spanning.delete(colIdx)
                }
                colIdx += 1
            }
        }

        Array.from(row.cells).forEach((cell) => {
            fillSpannedColumns(cell)

            const colspan = Math.min(Math.max(cell.colSpan, 1), MAX_COLSPAN)
            // 0 spans the rest of the row group, and no cell spans past it
            const rowspan = Math.min(cell.rowSpan || rows.length, rows.length - rowIdx)

            cell.removeAttribute('colspan')
            cell.removeAttribute('rowspan')

            for (let i = 0; i < colspan; i += 1) {
                if (i) {
                    cell.after(createEmptyCell(cell))
                }
                if (rowspan > 1) {
                    spanning.set(colIdx + i, { cell, rowCount: rowspan - 1 })
                }
            }
            colIdx += colspan
        })

        // merged cells from rows above that end the row
        const lastSpannedColIdx = Math.max(-1, ...spanning.keys())

        while (colIdx <= lastSpannedColIdx) {
            if (spanning.has(colIdx)) {
                fillSpannedColumns(null)
            } else {
                // a gap before a merged cell from above, so it stays in its column
                row.appendChild(row.ownerDocument.createElement(row.cells[0]?.localName ?? 'td'))
                colIdx += 1
            }
        }
    })
}

/**
 * Splits the merged cells of the tables in `root` into separate cells, as markdown tables can't merge cells: the
 * first keeps the content and the others are empty, like remark does when it turns HTML into markdown.
 */
export function splitTableCellSpans(root: ParentNode) {
    root.querySelectorAll('table').forEach((table) => {
        Array.from(table.tBodies)
            .concat([table.tHead, table.tFoot].filter((group) => !!group))
            .forEach((group) => splitRowGroupSpans(group.rows))
    })
}

/** `splitTableCellSpans()` for an HTML string; it's returned as it was when it has no merged cells. */
export function splitTableCellSpansInHTML(html: string) {
    if (!reSpan.test(html)) {
        return html
    }

    const container = document.createElement('div')

    container.innerHTML = html
    splitTableCellSpans(container)

    return container.innerHTML
}
