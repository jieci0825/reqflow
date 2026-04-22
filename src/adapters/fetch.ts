import type { Adapter, RequestConfig, Response } from '@/core/types'

import { tagRequestFailure } from '@/core/error-kind'

/** 将查询参数拼接到 URL */
function buildURL(url: string, params?: Record<string, any>): string {
    if (!params) return url

    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
        if (value != null) {
            searchParams.append(key, String(value))
        }
    }

    const queryString = searchParams.toString()
    if (!queryString) return url

    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}${queryString}`
}

/** 将 Headers 对象转换为普通键值对 */
function parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {}
    headers.forEach((value, key) => {
        result[key] = value
    })
    return result
}

/** 根据 responseType 解析响应体 */
async function parseBody(
    raw: globalThis.Response,
    responseType?: RequestConfig['responseType']
): Promise<any> {
    switch (responseType) {
        case 'text':
            return raw.text()
        case 'blob':
            return raw.blob()
        case 'arraybuffer':
            return raw.arrayBuffer()
        case 'json':
        default: {
            const text = await raw.text()
            if (!text) return null
            try {
                return JSON.parse(text)
            } catch {
                return text
            }
        }
    }
}

/** 判断该 HTTP 方法是否允许携带请求体 */
function canHaveBody(method: string): boolean {
    return method !== 'GET' && method !== 'HEAD'
}

/** 序列化请求体为 fetch 可接受的 BodyInit */
function serializeBody(data: any): BodyInit {
    if (
        typeof data === 'string' ||
        data instanceof FormData ||
        data instanceof Blob ||
        data instanceof ArrayBuffer ||
        data instanceof URLSearchParams
    ) {
        return data
    }
    return JSON.stringify(data)
}

/** 创建基于 Fetch API 的传输层适配器 */
export function fetchAdapter(): Adapter {
    return {
        async request(config: RequestConfig): Promise<Response> {
            const {
                url,
                method,
                headers,
                params,
                data,
                timeout,
                signal,
                responseType,
            } = config

            const fullURL = buildURL(url, params)

            const controller = new AbortController()
            let timeoutId: ReturnType<typeof setTimeout> | undefined

            // 检测是否外部是否传入了 AbortSignal
            if (signal) {
                // 如果 signal 已经是 aborted 状态（调用方在发请求前就取消了），则立即中止请求
                if (signal.aborted) {
                    // 传入参数，保留外部取消的原因
                    controller.abort(signal.reason)
                } else {
                    // 否则：
                    //  - 监听外部 signal 的 abort 事件
                    //  - 一旦触发，将中止转发到内部 controller
                    signal.addEventListener(
                        'abort',
                        () => {
                            // 将外部取消的原因（如果有）转发到内部 controller
                            controller.abort(signal.reason)
                        },
                        { once: true }
                    )
                }
            }

            // 如果传入了超时时间，则设置超时定时器，超时后中止请求
            if (timeout) {
                timeoutId = setTimeout(() => controller.abort(), timeout)
            }

            try {
                const init: RequestInit = {
                    method,
                    headers,
                    signal: controller.signal,
                }

                if (data !== undefined && canHaveBody(method)) {
                    try {
                        init.body = serializeBody(data)
                    } catch (err) {
                        throw tagRequestFailure(err, 'runtime')
                    }
                }

                let raw: globalThis.Response
                let body: any

                try {
                    raw = await fetch(fullURL, init)
                    body = await parseBody(raw, responseType)
                } catch (err) {
                    throw tagRequestFailure(err, 'network')
                }

                return {
                    data: body,
                    status: raw.status,
                    statusText: raw.statusText,
                    headers: parseHeaders(raw.headers),
                    config,
                }
            } finally {
                if (timeoutId !== undefined) {
                    clearTimeout(timeoutId)
                }
            }
        },
    }
}
