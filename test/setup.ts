import '@testing-library/jest-dom/vitest'

if (globalThis.Range) {
    Range.prototype.getClientRects = vi.fn().mockReturnValue({ length: 0 })
    Range.prototype.getBoundingClientRect = vi.fn().mockReturnValue({})
}

if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class ResizeObserver {
        observe() {}

        unobserve() {}

        disconnect() {}
    }
}

// ProseMirror reads the selection in a shadow root through execCommand on Safari, which jsdom's vendor matches
if (globalThis.document && !('execCommand' in document)) {
    Object.defineProperty(document, 'execCommand', { value: () => false, configurable: true })
}
