import type { Plugin, RequestConfig } from '@/core/types'

/** racePlugin 配置项 */
export interface RacePluginOptions {
    /** 自定义竞态 key 生成函数；默认从 meta.raceKey 读取 */
    generateKey?: (config: RequestConfig) => string | undefined
}

/** 竞态取消插件，同一 raceKey 的新请求自动 abort 前序请求，仅保留最新一次 */
export function racePlugin(options: RacePluginOptions = {}): Plugin {
    const { generateKey } = options

    const controllers = new Map<string, AbortController>()

    return {
        name: 'race',
        setup(ctx) {
            ctx.useMiddleware(async (config, next) => {
                const key = generateKey?.(config) ?? config.meta?.raceKey

                if (!key) {
                    return next(config)
                }

                const prev = controllers.get(key)
                if (prev) {
                    prev.abort()
                }

                const controller = new AbortController()
                controllers.set(key, controller)

                const signal = config.signal
                    ? combineSignals(config.signal, controller.signal)
                    : controller.signal

                try {
                    return await next({ ...config, signal })
                } finally {
                    if (controllers.get(key) === controller) {
                        controllers.delete(key)
                    }
                }
            })
        },
    }
}

/** 将用户侧 signal 与竞态 signal 合并，任一触发即 abort */
function combineSignals(
    existing: AbortSignal,
    race: AbortSignal
): AbortSignal {
    const combined = new AbortController()

    for (const signal of [existing, race]) {
        if (signal.aborted) {
            combined.abort(signal.reason)
            return combined.signal
        }

        signal.addEventListener(
            'abort',
            () => combined.abort(signal.reason),
            { once: true }
        )
    }

    return combined.signal
}
