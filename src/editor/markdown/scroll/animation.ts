import { SyncCallbacks } from './scroll-sync'

const ANIMATION_TIME = 100
const SCROLL_BLOCKING_RESET_DELAY = 15
let currentFrameId: number | null = null
let releaseTimer: ReturnType<typeof setTimeout> | null = null

function run(deltaScrollTop: number, { syncScrollTop, releaseEventBlock }: SyncCallbacks) {
    if (releaseTimer) {
        clearTimeout(releaseTimer)
    }

    syncScrollTop(deltaScrollTop)

    releaseTimer = setTimeout(() => {
        releaseEventBlock()
    }, SCROLL_BLOCKING_RESET_DELAY)
}

export function animate(
    curScrollTop: number,
    targetScrollTop: number,
    syncCallbacks: SyncCallbacks
) {
    const diff = targetScrollTop - curScrollTop
    const startTime = performance.now()

    // a new animation replaces the running one
    if (currentFrameId !== null) {
        cancelAnimationFrame(currentFrameId)
    }

    const step = (time: number) => {
        const progress = Math.max(0, time - startTime) / ANIMATION_TIME

        if (progress < 1) {
            // ease out
            run(Math.ceil(curScrollTop + diff * Math.sin((progress * Math.PI) / 2)), syncCallbacks)
            currentFrameId = requestAnimationFrame(step)
        } else {
            run(targetScrollTop, syncCallbacks)
            currentFrameId = null
        }
    }

    step(startTime)
}
