import { defineConfig } from 'vite'
import { svgText } from '../scripts/svg-text.ts'

export default defineConfig({
    plugins: [svgText()]
})
