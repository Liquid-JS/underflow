import { I18n } from './i18n'
import { enUS } from './texts/en-us'

const localeModules = import.meta.glob<Record<string, Record<string, string>>>(
    ['./*.ts', '!./i18n.ts', '!./*.spec.ts'],
    { eager: true }
)

// de-de.ts exports deDE, ar.ts exports ar
const exportName = (fileName: string) => fileName.replace(/\.ts$/, '').replace(/-(\w+)$/, (_, country: string) => country.toUpperCase())

const locales = Object.entries(localeModules)
    .map(([path, module]) => ({ fileName: path.split('/').pop()!, module }))
    .sort((a, b) => a.fileName.localeCompare(b.fileName))
const englishKeys = Object.keys(enUS).sort()

describe('i18n locale files', () => {
    locales.forEach(({ fileName, module }) => {
        it(`${fileName} should only export its texts as ${exportName(fileName)}`, () => {
            expect(Object.keys(module)).toEqual([exportName(fileName)])
        })

        it(`${fileName} should translate every text key`, () => {
            const data = module[exportName(fileName)]

            expect(Object.keys(data).sort()).toEqual(englishKeys)
            Object.keys(data).forEach((key) => {
                expect([key, data[key]]).toEqual([key, expect.stringMatching(/\S/)])
            })
        })
    })
})

describe('I18n.setLanguage()', () => {
    it('should merge texts into the registered ones without changing either', () => {
        const i18n = new I18n()
        const texts = { Write: 'Verfassen', Preview: 'Vorschau' }
        const override = { Preview: 'Ansicht' }

        i18n.setLanguage(['de', 'de-DE'], texts)
        i18n.setLanguage('de-DE', override)

        expect(i18n.get('Preview', 'de-DE')).toBe('Ansicht')
        expect(i18n.get('Write', 'de-DE')).toBe('Verfassen')
        expect(i18n.get('Preview', 'de')).toBe('Vorschau')
        expect(texts).toEqual({ Write: 'Verfassen', Preview: 'Vorschau' })
        expect(override).toEqual({ Preview: 'Ansicht' })
    })
})
