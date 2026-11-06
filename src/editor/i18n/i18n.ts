import { enUS } from './texts/en-us'

const DEFAULT_CODE = 'en-US'

class I18n {
    private code: string

    private langs: Map<string, Record<string, string>>

    constructor() {
        this.code = DEFAULT_CODE
        this.langs = new Map()
    }

    setCode(code?: string) {
        this.code = code || DEFAULT_CODE
    }

    setLanguage(codes: string | string[], data: Record<string, string>) {
        codes = ([] as string[]).concat(codes)

        // copy, so neither the registered texts nor the imported locale change
        codes.forEach((code) => this.langs.set(code, { ...this.langs.get(code), ...data }))
    }

    get(key: string, code?: string) {
        if (!code) {
            code = this.code
        }

        let langSet = this.langs.get(code)

        if (!langSet) {
            langSet = this.langs.get(DEFAULT_CODE)!
        }

        const text = langSet[key]

        if (!text) {
            throw new Error(`There is no text key "${key}" in ${code}`)
        }

        return text
    }
}

const i18n = new I18n()

// English is built in, so the editor works without importing a locale
i18n.setLanguage(['en', 'en-US'], enUS)

export { I18n }
export { i18n }
