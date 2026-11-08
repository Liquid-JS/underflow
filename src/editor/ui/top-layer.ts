const supported = typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function'

/**
 * Shows an absolutely positioned popup in the top layer, above the page, so an ancestor that clips its overflow,
 * e.g. a scrolling panel, doesn't cut it off. The popup keeps its `left` and `top`, from the element it's positioned
 * in, and moves by where that element is in the viewport, also while the page scrolls. It stays in its place in the
 * document, so its styles and events don't change. Without the Popover API it shows where it is.
 */
export class TopLayer {
    private el: HTMLElement | null = null

    private container: HTMLElement | null = null

    /** Shows the popup, which shows where it's positioned, in the top layer, or moves it there again. */
    show(el: HTMLElement) {
        if (this.el === el && this.container) {
            this.place()
            return
        }

        // the element it's positioned in, before it leaves it
        const container = el.offsetParent as HTMLElement | null

        if (!supported || !container) {
            return
        }

        this.hide()
        this.el = el
        this.container = container
        el.popover = 'manual'
        el.showPopover()
        this.place()
        window.addEventListener('scroll', this.place, { capture: true, passive: true })
        window.addEventListener('resize', this.place, { passive: true })
    }

    hide() {
        const { el } = this

        if (!el) {
            return
        }

        window.removeEventListener('scroll', this.place, { capture: true })
        window.removeEventListener('resize', this.place)
        if (el.matches(':popover-open')) {
            el.hidePopover()
        }
        el.removeAttribute('popover')
        el.style.translate = ''
        this.el = null
        this.container = null
    }

    private place = () => {
        const { el, container } = this

        if (el && container) {
            const { left, top } = container.getBoundingClientRect()

            // from the container's padding edge, as an absolutely positioned element
            el.style.translate = `${left + container.clientLeft}px ${top + container.clientTop}px`
        }
    }
}
