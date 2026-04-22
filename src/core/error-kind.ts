export type RequestFailureKind = 'network' | 'runtime'

const REQUEST_FAILURE_KIND = Symbol('reqflow.requestFailureKind')

type TaggedError = Error & {
    [REQUEST_FAILURE_KIND]?: RequestFailureKind
}

/** 将未知异常标准化为 Error，便于统一附加错误元信息 */
export function normalizeError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error))
}

/** 为异常打上请求失败类型标记，供插件在上层统一分类 */
export function tagRequestFailure(
    error: unknown,
    kind: RequestFailureKind
): Error {
    const normalized = normalizeError(error) as TaggedError
    Object.defineProperty(normalized, REQUEST_FAILURE_KIND, {
        value: kind,
        configurable: true,
    })
    return normalized
}

/** 仅当异常尚未带有失败类型时，补充一个默认分类 */
export function ensureRequestFailure(
    error: unknown,
    kind: RequestFailureKind
): Error {
    const normalized = normalizeError(error)
    return getRequestFailureKind(normalized)
        ? normalized
        : tagRequestFailure(normalized, kind)
}

/** 读取异常上附加的请求失败类型标记 */
export function getRequestFailureKind(
    error: unknown
): RequestFailureKind | undefined {
    // 如果 error 不是 Error 对象，则无法附加元信息，也就不可能有请求失败类型标记
    //  - 通常已知错误会被我们打上标记('network' 或 'http')，runtime 则是兜底分类，通常不是通过 tagRequestFailure 打上的，从而实现区分
    if (!(error instanceof Error)) {
        return undefined
    }

    return (error as TaggedError)[REQUEST_FAILURE_KIND]
}
