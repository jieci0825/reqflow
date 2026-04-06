import type { Plugin, RequestConfig, Response } from '@/core/types'

/** errorPlugin 传递给 onError 回调的错误信息 */
export interface RequestError {
    /** 错误来源：http 表示状态码异常，network 表示网络层抛出异常 */
    type: 'http' | 'network'
    /** 可读的错误描述 */
    message: string
    /** HTTP 状态码，仅在 type 为 http 时存在 */
    status?: number
    /** 标准化响应对象，仅在 type 为 http 时存在 */
    response?: Response
    /** 产生此错误的原始请求配置 */
    config: RequestConfig
    /** 原始异常对象，仅在 type 为 network 时存在 */
    cause?: Error
}

/** errorPlugin 配置项 */
export interface ErrorPluginOptions {
    /** 错误发生时的回调函数 */
    onError: (error: RequestError) => void
    /** 需要跳过（不触发 onError）的 HTTP 状态码列表 */
    skipCodes?: number[]
}

/** 统一捕获 HTTP 错误与网络异常，通过 onError 回调通知调用方 */
export function errorPlugin(options: ErrorPluginOptions): Plugin {
    const { onError, skipCodes = [] } = options

    return {
        name: 'error',
        setup(ctx) {
            ctx.useMiddleware(async (config, next) => {
                let response: Response

                try {
                    response = await next(config)
                } catch (err) {
                    const cause =
                        err instanceof Error ? err : new Error(String(err))
                    onError({
                        type: 'network',
                        message: cause.message,
                        config,
                        cause,
                    })
                    throw err
                }

                if (
                    response.status >= 400 &&
                    !skipCodes.includes(response.status)
                ) {
                    onError({
                        type: 'http',
                        message: `HTTP Error ${response.status}: ${response.statusText}`,
                        status: response.status,
                        response,
                        config,
                    })
                }

                return response
            })
        },
    }
}
