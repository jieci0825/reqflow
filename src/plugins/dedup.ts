import type { Plugin, RequestConfig, Response } from '@/core/types'

/** dedupPlugin 配置项 */
export interface DedupPluginOptions {
    /** 自定义请求去重 key 生成函数；默认用 method + url + 序列化 params */
    generateKey?: (config: RequestConfig) => string
}

/** 对并发的相同请求进行去重，共享同一个 Promise 避免重复发送 */
export function dedupPlugin(options: DedupPluginOptions = {}): Plugin {
    const { generateKey = defaultGenerateKey } = options

    const pending = new Map<string, Promise<Response>>()

    return {
        name: 'dedup',
        setup(ctx) {
            ctx.useMiddleware(async (config, next) => {
                if (config.meta?.dedup === false) {
                    return next(config)
                }

                const key = generateKey(config)

                const existing = pending.get(key)
                if (existing) {
                    return existing
                }

                const promise = next(config).finally(() => {
                    pending.delete(key)
                })
                pending.set(key, promise)

                return promise
            })
        },
    }
}

function defaultGenerateKey(config: RequestConfig): string {
    return `${config.method}:${config.url}:${JSON.stringify(config.params ?? {})}`
}
