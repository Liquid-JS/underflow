import { oneLineTrim } from 'common-tags'
import { splitTableCellSpans, splitTableCellSpansInHTML } from './table-spans'

function split(html: string) {
    const container = document.createElement('div')

    container.innerHTML = html
    splitTableCellSpans(container)

    return container.innerHTML
}

describe('splitTableCellSpans()', () => {
    it('should split a cell across columns, keeping its content in the first', () => {
        expect(split('<table><tbody><tr><td colspan="3">a</td><td>b</td></tr></tbody></table>')).toBe(
            '<table><tbody><tr><td>a</td><td></td><td></td><td>b</td></tr></tbody></table>'
        )
    })

    it('should split a cell across rows into the same column of the next rows', () => {
        expect(split(oneLineTrim`
            <table><tbody>
                <tr><td>a</td><td rowspan="3">b</td><td>c</td></tr>
                <tr><td>d</td><td>e</td></tr>
                <tr><td>f</td><td>g</td></tr>
            </tbody></table>
        `)).toBe(oneLineTrim`
            <table><tbody>
                <tr><td>a</td><td>b</td><td>c</td></tr>
                <tr><td>d</td><td></td><td>e</td></tr>
                <tr><td>f</td><td></td><td>g</td></tr>
            </tbody></table>
        `)
    })

    it('should split a cell across rows and columns', () => {
        expect(split(oneLineTrim`
            <table><tbody>
                <tr><td colspan="2" rowspan="2">a</td><td>b</td></tr>
                <tr><td>c</td></tr>
            </tbody></table>
        `)).toBe(oneLineTrim`
            <table><tbody>
                <tr><td>a</td><td></td><td>b</td></tr>
                <tr><td></td><td></td><td>c</td></tr>
            </tbody></table>
        `)
    })

    it('should fill merged cells from above at the end of a row', () => {
        expect(split(oneLineTrim`
            <table><tbody>
                <tr><td>a</td><td rowspan="2">b</td></tr>
                <tr><td>c</td></tr>
            </tbody></table>
        `)).toBe(oneLineTrim`
            <table><tbody>
                <tr><td>a</td><td>b</td></tr>
                <tr><td>c</td><td></td></tr>
            </tbody></table>
        `)
    })

    it('should keep head cells as head cells', () => {
        expect(split('<table><thead><tr><th colspan="2">a</th></tr></thead></table>')).toBe(
            '<table><thead><tr><th>a</th><th></th></tr></thead></table>'
        )
    })

    it('should not span rows past the row group, and treat rowspan="0" as the rest of it', () => {
        expect(split(oneLineTrim`
            <table>
                <thead><tr><th rowspan="5">a</th><th>b</th></tr></thead>
                <tbody>
                    <tr><td rowspan="0">c</td><td>d</td></tr>
                    <tr><td>e</td></tr>
                </tbody>
            </table>
        `)).toBe(oneLineTrim`
            <table>
                <thead><tr><th>a</th><th>b</th></tr></thead>
                <tbody>
                    <tr><td>c</td><td>d</td></tr>
                    <tr><td></td><td>e</td></tr>
                </tbody>
            </table>
        `)
    })
})

describe('splitTableCellSpansInHTML()', () => {
    it('should return HTML without merged cells as it was', () => {
        const html = '<table><tr><td>a</td></tr></table>'

        expect(splitTableCellSpansInHTML(html)).toBe(html)
    })

    it('should split merged cells', () => {
        expect(splitTableCellSpansInHTML('<table><tr><td colspan="2">a</td></tr></table>')).toBe(
            '<table><tbody><tr><td>a</td><td></td></tr></tbody></table>'
        )
    })
})
