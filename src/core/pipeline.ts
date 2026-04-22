import type {
    Adapter,
    Middleware,
    Next,
    RequestConfig,
    Response,
} from './types'

import { ensureRequestFailure } from './error-kind'

/** 将中间件数组与适配器组合为洋葱模型执行链 */
export function compose(middlewares: Middleware[], adapter: Adapter): Next {
    return function dispatch(config: RequestConfig): Promise<Response> {
        let index = -1

        function next(i: number, cfg: RequestConfig): Promise<Response> {
            if (i <= index) {
                return Promise.reject(new Error('next() 被重复调用'))
            }

            index = i

            if (i === middlewares.length) {
                try {
                    return adapter.request(cfg).catch(err => {
                        throw ensureRequestFailure(err, 'network')
                    })
                } catch (err) {
                    return Promise.reject(ensureRequestFailure(err, 'network'))
                }
            }

            const middleware = middlewares[i]
            // 遵循洋葱模型的执行顺序，知道最后一个 next(即中间件) 执行完成之后，此时 promise 状态确定，执行 finally 回调，将 index 重置为当前中间件索引，实现洋葱模型回退，索引归零，可以再次执行下一个中间件
            // 这对重试场景至关重要——当 retryPlugin 的 await next(config) 返回（无论成功或失败），finally 已经把 index 重置回去了，所以重试时再次调用 next(config) 能通过 i <= index 的守卫检查。
            return middleware(cfg, nextCfg =>
                next(i + 1, nextCfg).finally(() => {
                    index = i
                })
            )
        }

        return next(0, config)
    }
}
