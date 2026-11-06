import { minifyHtm } from './minify-htm'

const field = '@TEMPLATE_EXPRESSION'

describe('minifyHtm', () => {
    it('should drop whitespace with line breaks around text, as htm does', () => {
        expect(minifyHtm(`
            <div class="a">
                <span>${field}</span>
                text  with  spaces
                ${field}
            </div>
        `)).toBe(`<div class="a"><span>${field}</span>text  with  spaces${field}</div>`)
    })

    it('should keep whitespace without line breaks', () => {
        expect(minifyHtm(`<b>a</b> <i>b</i> ${field} c`)).toBe(`<b>a</b> <i>b</i> ${field} c`)
    })

    it('should shrink whitespace in tags and keep components, spreads and quoted values', () => {
        expect(minifyHtm(`<${field}
            a=${field}
            b="x  ${field}  y"
            ...${field}
        />`)).toBe(`<${field} a=${field} b="x  ${field}  y" ...${field}/>`)
        expect(minifyHtm('<input  type="text"  >')).toBe('<input type="text">')
    })
})
