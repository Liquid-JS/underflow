export function isFunction(value: unknown): value is ((...args: any[]) => any) | (abstract new (...args: any[]) => any) {
    return typeof value === 'function'
}

export function isString(value: unknown): value is string {
    return typeof value === 'string' || value instanceof String
}

export function isNumber(value: unknown): value is number {
    return typeof value === 'number' || value instanceof Number
}

export function isBoolean(value: unknown): value is boolean {
    return typeof value === 'boolean' || value instanceof Boolean
}

export function isUndefined(value: unknown): value is undefined {
    return typeof value === 'undefined'
}

export function isNull(value: unknown): value is null {
    return value === null
}

/** Objects and functions (anything that isn't a primitive). */
export function isObject(value: unknown): value is object {
    return value === Object(value)
}

/** `undefined`, `null` and `false`. */
export function isFalsy(value: unknown) {
    return value === undefined || value === null || value === false
}

/** Iterates an array; returning `false` from the iteratee stops the loop. */
export function forEachArray<T>(
    arr: ArrayLike<T>,
    iteratee: (value: T, index: number, arr: ArrayLike<T>) => boolean | void,
    context?: unknown
) {
    for (let i = 0; i < arr.length; i += 1) {
        if (iteratee.call(context, arr[i], i, arr) === false) {
            break
        }
    }
}

/** Iterates the own enumerable properties of an object; returning `false` stops the loop. */
export function forEachOwnProperties<T extends object>(
    obj: T,
    iteratee: (value: NonNullable<T[keyof T]>, key: keyof T, targetObj: T) => boolean | void,
    context?: unknown
) {
    for (const key of Object.keys(obj) as Array<keyof T>) {
        if (iteratee.call(context, obj[key] as NonNullable<T[keyof T]>, key, obj) === false) {
            break
        }
    }
}

export function css(element: Element, key: string | Record<string, any>, value?: string) {
    const style = (element as HTMLElement).style as unknown as Record<string, unknown>

    if (isString(key)) {
        style[key] = value
    } else {
        Object.keys(key).forEach((k) => {
            style[k] = key[k]
        })
    }
}

/**
 * Calls `fn` right away, then at most once per `interval` while calls keep coming,
 * and once more after the last call.
 */
export function throttle<A extends unknown[]>(fn: (...args: A) => void, interval = 0) {
    let last = 0
    let timer: ReturnType<typeof setTimeout> | null = null
    let leading = true

    const throttled = (...args: A) => {
        const now = Date.now()

        if (leading) {
            leading = false
            last = now
            fn(...args)
            return
        }

        if (timer) {
            clearTimeout(timer)
        }

        if (now - last >= interval) {
            last = now
            fn(...args)
        } else {
            timer = setTimeout(() => {
                timer = null
                last = Date.now()
                fn(...args)
            }, interval)
        }
    }

    throttled.reset = () => {
        leading = true
        last = 0
        if (timer) {
            clearTimeout(timer)
            timer = null
        }
    }

    return throttled
}
