const reField = /(@TEMPLATE_EXPRESSION_*)/

/**
 * Minifies the markup of the UI's htm templates (`html`...``) the way htm reads it, for
 * rollup-plugin-minify-template-literals: text loses whitespace that contains a line break at its start and end, as htm
 * drops it anyway, and whitespace inside tags shrinks to a space. HTML minifiers don't know htm's components
 * (`<${Popup} />`) and spreads, and keep a space next to expressions where htm has none.
 */
export const minifyHtm = (markup: string) => {
    let out = ''
    let text = ''
    let inTag = false
    let quote = ''

    const flushText = () => {
        out += text.replace(/^\s*\n\s*|\s*\n\s*$/g, '')
        text = ''
    }

    for (const part of markup.split(reField)) {
        if (reField.test(part)) {
            if (inTag) {
                out += part
            } else {
                flushText()
                out += part
            }
            continue
        }

        for (const char of part) {
            if (!inTag) {
                if (char === '<') {
                    flushText()
                    inTag = true
                    out += char
                } else {
                    text += char
                }
            } else if (quote) {
                out += char
                if (char === quote) {
                    quote = ''
                }
            } else if (char === '"' || char === '\'') {
                quote = char
                out += char
            } else if (/\s/.test(char)) {
                if (!out.endsWith(' ') && !out.endsWith('<')) {
                    out += ' '
                }
            } else if (char === '>') {
                out = out.replace(/ (\/?)$/, '$1') + char
                inTag = false
            } else {
                out += char
            }
        }
    }
    flushText()

    return out
}
