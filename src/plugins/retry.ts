import type { Plugin, Response } from '@/core/types'

import type { RequestError } from './error'

/** retryPlugin 配置项 */
export interface RetryPluginOptions {
    /** 最大重试次数 */
    maxRetries: number
    /** 重试间隔（毫秒），支持传入函数实现退避策略，参数 attempt 从 1 开始 */
    delay?: number | ((attempt: number) => number)
    /** 判断是否需要重试，返回 true 则重试；默认对所有错误重试 */
    retryOn?: (error: RequestError) => boolean
}

/** 请求失败时按策略自动重试，支持自定义重试条件与退避间隔 */
export function retryPlugin(options: RetryPluginOptions): Plugin {
    const { maxRetries, delay = 0, retryOn } = options

    return {
        name: 'retry',
        setup(ctx) {
            ctx.useMiddleware(async (config, next) => {
                let retryCount = 0

                const getDelay = (attempt: number) => {
                    return typeof delay === 'function' ? delay(attempt) : delay
                }

                const canRetry = (error: RequestError) => {
                    return (
                        (!retryOn || retryOn(error)) && retryCount < maxRetries
                    )
                }

                const waitAndPrepare = async () => {
                    // 重试次数递增
                    retryCount++
                    config = {
                        ...config,
                        meta: { ...config.meta, retryCount },
                    }
                    const waitTime = getDelay(retryCount)
                    if (waitTime > 0) {
                        await new Promise<void>(r => setTimeout(r, waitTime))
                    }
                }

                // 无限循环，直到请求成功或达到最大重试次数
                while (true) {
                    let response: Response

                    try {
                        response = await next(config)
                    } catch (err) {
                        const cause =
                            err instanceof Error ? err : new Error(String(err))
                        const error: RequestError = {
                            type: 'network',
                            message: cause.message,
                            config,
                            cause,
                        }

                        if (canRetry(error)) {
                            await waitAndPrepare()
                            continue
                        }

                        throw err
                    }

                    if (response.status >= 400) {
                        const error: RequestError = {
                            type: 'http',
                            message: `HTTP Error ${response.status}: ${response.statusText}`,
                            status: response.status,
                            response,
                            config,
                        }

                        if (canRetry(error)) {
                            // 如果可以重试，则等待并准备重试
                            // - 等待重试的过程就类似使用一个同步延迟等待
                            await waitAndPrepare()
                            // 等待结束之后，调回 while 循环，让循环再次开始，来判断是否可以重试
                            continue
                        }
                    }

                    return response
                }
            })
        },
    }
}
