import type { Adapter, Middleware, Next, RequestConfig, Response } from './types'

/** 将中间件数组与适配器组合为洋葱模型执行链 */
export function compose(middlewares: Middleware[], adapter: Adapter): Next {
    return function dispatch(config: RequestConfig): Promise<Response> {
        let index = -1

        function next(i: number, cfg: RequestConfig): Promise<Response> {
            if (i <= index) {
                return Promise.reject(new Error('next() called multiple times'))
            }
            index = i

            if (i === middlewares.length) {
                return adapter.request(cfg)
            }

            const middleware = middlewares[i]
            return middleware(cfg, (nextCfg) => next(i + 1, nextCfg))
        }

        return next(0, config)
    }
}
