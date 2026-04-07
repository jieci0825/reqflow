import type { Plugin } from '@/core/types'

/** loadingPlugin 配置项 */
export interface LoadingPluginOptions {
    /** 开始显示 loading 时的回调 */
    onShow: () => void
    /** 隐藏 loading 时的回调 */
    onHide: () => void
    /** 延迟显示阈值（毫秒），避免快速请求闪烁 loading；默认 0（立即显示） */
    delay?: number
}

/** 管理全局 loading 状态，支持并发计数与延迟显示以避免闪烁 */
export function loadingPlugin(options: LoadingPluginOptions): Plugin {
    const { onShow, onHide, delay = 0 } = options

    let count = 0
    let delayTimer: ReturnType<typeof setTimeout> | null = null

    return {
        name: 'loading',
        setup(ctx) {
            ctx.useMiddleware(async (config, next) => {
                const silent = config.meta?.silent === true

                if (!silent) {
                    count++
                    if (count === 1) {
                        if (delay > 0) {
                            delayTimer = setTimeout(() => {
                                delayTimer = null
                                onShow()
                            }, delay)
                        } else {
                            onShow()
                        }
                    }
                }

                try {
                    return await next(config)
                } finally {
                    if (!silent) {
                        count--
                        if (count === 0) {
                            if (delayTimer) {
                                clearTimeout(delayTimer)
                                delayTimer = null
                            } else {
                                onHide()
                            }
                        }
                    }
                }
            })
        },
    }
}
