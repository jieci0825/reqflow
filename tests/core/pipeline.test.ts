import { describe, it, expect, vi } from 'vitest'

import { compose } from '@/core/pipeline'

import type { Adapter, Middleware, RequestConfig, Response } from '@/core/types'

function createConfig(overrides?: Partial<RequestConfig>): RequestConfig {
    return { url: '/test', method: 'GET', ...overrides }
}

function createResponse(overrides?: Partial<Response>): Response {
    return {
        data: null,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: createConfig(),
        ...overrides,
    }
}

function createAdapter(response?: Partial<Response>): Adapter {
    return {
        request: vi.fn(async (config: RequestConfig) =>
            createResponse({ config, ...response })
        ),
    }
}

describe('compose', () => {
    it('无中间件时直接走 adapter', async () => {
        const adapter = createAdapter({ data: 'direct' })
        const dispatch = compose([], adapter)

        const config = createConfig()
        const res = await dispatch(config)

        expect(res.data).toBe('direct')
        expect(adapter.request).toHaveBeenCalledOnce()
        expect(adapter.request).toHaveBeenCalledWith(config)
    })

    it('洋葱模型执行顺序：A → B → adapter → B → A', async () => {
        const order: string[] = []
        const adapter = createAdapter()

        const middlewareA: Middleware = async (config, next) => {
            order.push('A-before')
            const res = await next(config)
            order.push('A-after')
            return res
        }

        const middlewareB: Middleware = async (config, next) => {
            order.push('B-before')
            const res = await next(config)
            order.push('B-after')
            return res
        }

        const dispatch = compose([middlewareA, middlewareB], adapter)
        await dispatch(createConfig())

        expect(order).toEqual(['A-before', 'B-before', 'B-after', 'A-after'])
    })

    it('中间件可以修改请求配置', async () => {
        const adapter = createAdapter()

        const middleware: Middleware = async (config, next) => {
            return next({
                ...config,
                headers: { ...config.headers, 'X-Custom': 'injected' },
            })
        }

        const dispatch = compose([middleware], adapter)
        await dispatch(createConfig())

        expect(adapter.request).toHaveBeenCalledWith(
            expect.objectContaining({
                headers: { 'X-Custom': 'injected' },
            })
        )
    })

    it('中间件可以修改响应', async () => {
        const adapter = createAdapter({ data: 'raw' })

        const middleware: Middleware = async (config, next) => {
            const res = await next(config)
            return { ...res, data: `transformed(${res.data})` }
        }

        const dispatch = compose([middleware], adapter)
        const res = await dispatch(createConfig())

        expect(res.data).toBe('transformed(raw)')
    })

    it('短路行为：中间件不调 next() 直接返回', async () => {
        const adapter = createAdapter()

        const shortCircuit: Middleware = async () => {
            return createResponse({ data: 'cached', status: 200 })
        }

        const dispatch = compose([shortCircuit], adapter)
        const res = await dispatch(createConfig())

        expect(res.data).toBe('cached')
        expect(adapter.request).not.toHaveBeenCalled()
    })

    it('短路时下游中间件不会执行', async () => {
        const adapter = createAdapter()
        const downstreamFn = vi.fn()

        const shortCircuit: Middleware = async () => {
            return createResponse({ data: 'early-return' })
        }

        const downstream: Middleware = async (config, next) => {
            downstreamFn()
            return next(config)
        }

        const dispatch = compose([shortCircuit, downstream], adapter)
        await dispatch(createConfig())

        expect(downstreamFn).not.toHaveBeenCalled()
        expect(adapter.request).not.toHaveBeenCalled()
    })

    it('next() 重复调用抛出错误', async () => {
        const adapter = createAdapter()

        const badMiddleware: Middleware = async (config, next) => {
            await next(config)
            return next(config)
        }

        const dispatch = compose([badMiddleware], adapter)

        await expect(dispatch(createConfig())).rejects.toThrow(
            'next() 被重复调用'
        )
    })

    it('中间件抛出的异常会向外层冒泡', async () => {
        const adapter = createAdapter()

        const errorMiddleware: Middleware = async () => {
            throw new Error('middleware error')
        }

        const dispatch = compose([errorMiddleware], adapter)

        await expect(dispatch(createConfig())).rejects.toThrow(
            'middleware error'
        )
    })

    it('外层中间件可以 catch 内层抛出的异常', async () => {
        const adapter = createAdapter()

        const inner: Middleware = async () => {
            throw new Error('inner error')
        }

        const outer: Middleware = async (config, next) => {
            try {
                return await next(config)
            } catch {
                return createResponse({ data: 'fallback', status: 500 })
            }
        }

        const dispatch = compose([outer, inner], adapter)
        const res = await dispatch(createConfig())

        expect(res.data).toBe('fallback')
        expect(res.status).toBe(500)
    })

    it('adapter 抛出的异常可被中间件捕获', async () => {
        const adapter: Adapter = {
            request: vi.fn(async () => {
                throw new Error('network error')
            }),
        }

        const errorHandler: Middleware = async (config, next) => {
            try {
                return await next(config)
            } catch {
                return createResponse({
                    data: null,
                    status: 0,
                    statusText: 'Network Error',
                })
            }
        }

        const dispatch = compose([errorHandler], adapter)
        const res = await dispatch(createConfig())

        expect(res.status).toBe(0)
        expect(res.statusText).toBe('Network Error')
    })

    it('多层中间件配合 adapter 的完整洋葱流程', async () => {
        const timeline: string[] = []

        const adapter: Adapter = {
            request: vi.fn(async config => {
                timeline.push('adapter')
                return createResponse({ config, data: 'response' })
            }),
        }

        const m1: Middleware = async (config, next) => {
            timeline.push('m1-in')
            const res = await next(config)
            timeline.push('m1-out')
            return res
        }

        const m2: Middleware = async (config, next) => {
            timeline.push('m2-in')
            const res = await next(config)
            timeline.push('m2-out')
            return res
        }

        const m3: Middleware = async (config, next) => {
            timeline.push('m3-in')
            const res = await next(config)
            timeline.push('m3-out')
            return res
        }

        const dispatch = compose([m1, m2, m3], adapter)
        await dispatch(createConfig())

        expect(timeline).toEqual([
            'm1-in',
            'm2-in',
            'm3-in',
            'adapter',
            'm3-out',
            'm2-out',
            'm1-out',
        ])
    })
})
