const ANIMATION_TIME = 100

/**
 * Scrolls from one position to another over a short time, easing out, calling `scrollTo` once a frame. Returns a
 * function that stops it.
 */
export function animate(curScrollTop: number, targetScrollTop: number, scrollTo: (scrollTop: number) => void) {
    const diff = targetScrollTop - curScrollTop
    const startTime = performance.now()
    let frameId: number | null = null

    const step = (time: number) => {
        const progress = Math.max(0, time - startTime) / ANIMATION_TIME

        if (progress < 1) {
            scrollTo(curScrollTop + diff * Math.sin((progress * Math.PI) / 2))
            frameId = requestAnimationFrame(step)
        } else {
            scrollTo(targetScrollTop)
            frameId = null
        }
    }

    step(startTime)

    return () => {
        if (frameId !== null) {
            cancelAnimationFrame(frameId)
            frameId = null
        }
    }
}
