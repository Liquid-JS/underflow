import { changePastedHTML } from './paste'

describe('changePastedHTML()', () => {
    const html =
        '<p style="margin: 0"><span style="color: red">foo</span> <span class="keep" style="font-size: 20px">bar</span> <b style="font-weight: 700">baz</b></p>'

    it('should keep inline styles by default', () => {
        expect(changePastedHTML(html)).toBe(html)
    })

    it('should remove inline styles and unwrap styling-only elements with stripStyles', () => {
        expect(changePastedHTML(html, true)).toBe(
            '<p>foo <span class="keep">bar</span> <b>baz</b></p>'
        )
    })

    it('should unwrap nested styling elements', () => {
        expect(
            changePastedHTML('<p><font color="red"><span>foo</span></font><span>bar</span></p>', true)
        ).toBe('<p><font color="red">foo</font>bar</p>')
    })

    it('should split merged table cells, including in table rows pasted without their table', () => {
        expect(changePastedHTML('<tr><td colspan="2">a</td></tr><tr><td>b</td><td>c</td></tr>')).toBe(
            '<table><tbody><tr><td>a</td><td></td></tr><tr><td>b</td><td>c</td></tr></tbody></table>'
        )
    })
})
