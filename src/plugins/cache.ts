import type { Method, Plugin, RequestConfig, Response } from '@/core/types'

/** cachePlugin 配置项 */
export interface CachePluginOptions {
    /** 缓存有效期（毫秒） */
    ttl: number
    /** 需要缓存的 HTTP 方法列表，默认 ['GET'] */
    methods?: Method[]
    /** 自定义缓存 key 生成函数 */
    generateKey?: (config: RequestConfig) => string
    /** 排除函数，返回 true 时该请求不走缓存 */
    exclude?: (config: RequestConfig) => boolean
}

interface CacheEntry {
    response: Response
    timestamp: number
}

/** 对请求结果进行缓存，在 TTL 有效期内直接返回缓存数据，避免重复请求 */
export function cachePlugin(options: CachePluginOptions): Plugin {
    const {
        ttl,
        methods = ['GET'],
        generateKey = defaultGenerateKey,
        exclude,
    } = options

    const cache = new Map<string, CacheEntry>()

    return {
        name: 'cache',
        setup(ctx) {
            ctx.useMiddleware(async (config, next) => {
                if (config.meta?.cache === false) {
                    return next(config)
                }

                if (!methods.includes(config.method)) {
                    return next(config)
                }

                if (exclude?.(config)) {
                    return next(config)
                }

                const key = generateKey(config)
                const entry = cache.get(key)

                if (entry && Date.now() - entry.timestamp < ttl) {
                    return structuredClone(entry.response)
                }

                const response = await next(config)
                cache.set(key, { response: structuredClone(response), timestamp: Date.now() })

                return response
            })
        },
    }
}

function defaultGenerateKey(config: RequestConfig): string {
    return `${config.method}:${config.url}:${JSON.stringify(config.params ?? {})}`
}
