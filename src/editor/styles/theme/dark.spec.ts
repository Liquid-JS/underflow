import fs from 'fs'
import path from 'path'

function readCSS(file: string) {
    return fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8')
}

function getDefinedVariables(css: string, selector: string) {
    const start = css.indexOf(`${selector} {`)
    const block = css.slice(start, css.indexOf('}', start))

    return (block.match(/--uf-[\w-]+(?=:)/g) || []).sort()
}

describe('theme variables', () => {
    const variablesCSS = readCSS('ui/_variables.scss')
    // every partial of the editor interface, where the variables are used
    const interfaceCSS = fs
        .readdirSync(path.resolve(__dirname, '../ui'))
        .filter((file) => file.endsWith('.scss'))
        .map((file) => readCSS(`ui/${file}`))
        .join('\n')
    const darkCSS = readCSS('theme/dark.scss')
    const lightVariables = getDefinedVariables(variablesCSS, ':root')
    const darkVariables = getDefinedVariables(darkCSS, '.uf-dark')

    it('should define every used variable', () => {
        const used = new Set(
            `${interfaceCSS}${darkCSS}`.match(/(?<=var\()--uf-[\w-]+/g) || []
        )

        expect(used.size).toBeGreaterThan(0)
        used.forEach((name) => expect(lightVariables).toContain(name))
    })

    it('should override every variable in the dark theme', () => {
        expect(darkVariables).toEqual(lightVariables)
    })
})
