import { describe, it, expect, vi } from 'vitest'

import { createRequest } from '@/core/engine'
import { retryPlugin } from '@/plugins/retry'

import type { Adapter, RequestConfig, Response } from '@/core/types'
import type { RequestError } from '@/plugins/error'

function createMockAdapter(overrides?: Partial<Response>): Adapter {
    return {
        request: vi.fn(async (config: RequestConfig) => ({
            data: null,
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
            ...overrides,
        })),
    }
}

describe('retryPlugin', () => {
    it('请求成功时不触发任何重试逻辑', async () => {
        const adapter = createMockAdapter({ data: 'ok' })
        const engine = createRequest({
            adapter,
            plugins: [retryPlugin({ maxRetries: 3 })],
        })

        const res = await engine.get('/users')

        expect(res.data).toBe('ok')
        expect(adapter.request).toHaveBeenCalledOnce()
    })

    it('网络异常后重试指定次数直至成功', async () => {
        const networkError = new Error('network error')
        let callCount = 0
        const adapter: Adapter = {
            request: vi.fn(async (config: RequestConfig) => {
                callCount++
                if (callCount <= 2) throw networkError
                return {
                    data: 'recovered',
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    config,
                }
            }),
        }
        const engine = createRequest({
            adapter,
            plugins: [retryPlugin({ maxRetries: 3 })],
        })

        const res = await engine.get('/users')

        expect(res.data).toBe('recovered')
        expect(adapter.request).toHaveBeenCalledTimes(3)
    })

    it('达到最大重试次数后仍然抛出原始错误', async () => {
        const networkError = new Error('persistent error')
        const adapter: Adapter = {
            request: vi.fn(async () => {
                throw networkError
            }),
        }
        const engine = createRequest({
            adapter,
            plugins: [retryPlugin({ maxRetries: 2 })],
        })

        await expect(engine.get('/users')).rejects.toThrow('persistent error')
        expect(adapter.request).toHaveBeenCalledTimes(3)
    })

    it('delay 为数字时等待对应毫秒后重试', async () => {
        vi.useFakeTimers()

        try {
            const networkError = new Error('error')
            let callCount = 0
            const adapter: Adapter = {
                request: vi.fn(async (config: RequestConfig) => {
                    callCount++
                    if (callCount === 1) throw networkError
                    return {
                        data: 'ok',
                        status: 200,
                        statusText: 'OK',
                        headers: {},
                        config,
                    }
                }),
            }
            const engine = createRequest({
                adapter,
                plugins: [retryPlugin({ maxRetries: 1, delay: 1000 })],
            })

            const promise = engine.get('/users')

            await vi.advanceTimersByTimeAsync(0)
            expect(adapter.request).toHaveBeenCalledTimes(1)

            await vi.advanceTimersByTimeAsync(999)
            expect(adapter.request).toHaveBeenCalledTimes(1)

            await vi.advanceTimersByTimeAsync(1)
            expect(adapter.request).toHaveBeenCalledTimes(2)

            const res = await promise
            expect(res.data).toBe('ok')
        } finally {
            vi.useRealTimers()
        }
    })

    it('delay 为函数时每次重试调用该函数获取间隔', async () => {
        vi.useFakeTimers()

        try {
            const networkError = new Error('error')
            let callCount = 0
            const adapter: Adapter = {
                request: vi.fn(async (config: RequestConfig) => {
                    callCount++
                    if (callCount <= 3) throw networkError
                    return {
                        data: 'ok',
                        status: 200,
                        statusText: 'OK',
                        headers: {},
                        config,
                    }
                }),
            }
            const delayFn = vi.fn((attempt: number) => attempt * 100)
            const engine = createRequest({
                adapter,
                plugins: [retryPlugin({ maxRetries: 3, delay: delayFn })],
            })

            const promise = engine.get('/users')

            await vi.advanceTimersByTimeAsync(0)
            expect(adapter.request).toHaveBeenCalledTimes(1)

            await vi.advanceTimersByTimeAsync(100)
            expect(adapter.request).toHaveBeenCalledTimes(2)
            expect(delayFn).toHaveBeenCalledWith(1)

            await vi.advanceTimersByTimeAsync(200)
            expect(adapter.request).toHaveBeenCalledTimes(3)
            expect(delayFn).toHaveBeenCalledWith(2)

            await vi.advanceTimersByTimeAsync(300)
            expect(adapter.request).toHaveBeenCalledTimes(4)
            expect(delayFn).toHaveBeenCalledWith(3)

            const res = await promise
            expect(res.data).toBe('ok')
        } finally {
            vi.useRealTimers()
        }
    })

    it('retryOn 返回 false 时不重试，直接抛出', async () => {
        const networkError = new Error('do not retry')
        const adapter: Adapter = {
            request: vi.fn(async () => {
                throw networkError
            }),
        }
        const engine = createRequest({
            adapter,
            plugins: [
                retryPlugin({
                    maxRetries: 3,
                    retryOn: () => false,
                }),
            ],
        })

        await expect(engine.get('/users')).rejects.toThrow('do not retry')
        expect(adapter.request).toHaveBeenCalledOnce()
    })

    it('retryOn 可按错误类型选择性重试', async () => {
        let callCount = 0
        const adapter: Adapter = {
            request: vi.fn(async (config: RequestConfig) => {
                callCount++
                if (callCount === 1) throw new Error('timeout')
                if (callCount === 2) throw new Error('auth failed')
                return {
                    data: 'ok',
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    config,
                }
            }),
        }
        const engine = createRequest({
            adapter,
            plugins: [
                retryPlugin({
                    maxRetries: 3,
                    retryOn: (error: RequestError) =>
                        error.message !== 'auth failed',
                }),
            ],
        })

        await expect(engine.get('/users')).rejects.toThrow('auth failed')
        expect(adapter.request).toHaveBeenCalledTimes(2)
    })

    it('运行时异常会以 runtime 类型传给 retryOn', async () => {
        const retryOn = vi.fn((error: RequestError) => error.type !== 'runtime')
        const adapter: Adapter = {
            request: vi.fn(async (config: RequestConfig) => ({
                data: 'ok',
                status: 200,
                statusText: 'OK',
                headers: {},
                config,
            })),
        }
        const engine = createRequest({
            adapter,
            plugins: [
                retryPlugin({
                    maxRetries: 3,
                    retryOn,
                }),
            ],
        })

        await expect(
            engine.get('/users', {
                middleware: [
                    async () => {
                        throw new Error('middleware crashed')
                    },
                ],
            })
        ).rejects.toThrow('middleware crashed')

        expect(retryOn).toHaveBeenCalledOnce()
        expect(retryOn.mock.calls[0][0].type).toBe('runtime')
        expect(adapter.request).not.toHaveBeenCalled()
    })

    it('HTTP 状态码错误（如 500）也能触发重试', async () => {
        let callCount = 0
        const adapter: Adapter = {
            request: vi.fn(async (config: RequestConfig) => {
                callCount++
                if (callCount <= 2) {
                    return {
                        data: null,
                        status: 500,
                        statusText: 'Internal Server Error',
                        headers: {},
                        config,
                    }
                }
                return {
                    data: 'recovered',
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    config,
                }
            }),
        }
        const engine = createRequest({
            adapter,
            plugins: [retryPlugin({ maxRetries: 3 })],
        })

        const res = await engine.get('/users')

        expect(res.data).toBe('recovered')
        expect(adapter.request).toHaveBeenCalledTimes(3)
    })

    it('HTTP 状态码错误达到最大重试次数后返回最后一次响应', async () => {
        const adapter: Adapter = {
            request: vi.fn(async (config: RequestConfig) => ({
                data: { error: 'server error' },
                status: 500,
                statusText: 'Internal Server Error',
                headers: {},
                config,
            })),
        }
        const engine = createRequest({
            adapter,
            plugins: [retryPlugin({ maxRetries: 2 })],
        })

        const res = await engine.get('/users')

        expect(res.status).toBe(500)
        expect(res.data).toEqual({ error: 'server error' })
        expect(adapter.request).toHaveBeenCalledTimes(3)
    })

    it('retryOn 对 HTTP 状态码错误返回 false 时不重试', async () => {
        const adapter: Adapter = {
            request: vi.fn(async (config: RequestConfig) => ({
                data: null,
                status: 404,
                statusText: 'Not Found',
                headers: {},
                config,
            })),
        }
        const engine = createRequest({
            adapter,
            plugins: [
                retryPlugin({
                    maxRetries: 3,
                    retryOn: (error: RequestError) =>
                        error.type === 'http' && error.status! >= 500,
                }),
            ],
        })

        const res = await engine.get('/not-exist')

        expect(res.status).toBe(404)
        expect(adapter.request).toHaveBeenCalledOnce()
    })

    it('通过 meta.retryCount 传递当前已重试次数', async () => {
        const receivedRetryCountValues: Array<number | undefined> = []
        let callCount = 0
        const adapter: Adapter = {
            request: vi.fn(async (config: RequestConfig) => {
                receivedRetryCountValues.push(config.meta?.retryCount)
                callCount++
                if (callCount <= 2) throw new Error('error')
                return {
                    data: 'ok',
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    config,
                }
            }),
        }
        const engine = createRequest({
            adapter,
            plugins: [retryPlugin({ maxRetries: 3 })],
        })

        await engine.get('/users')

        expect(receivedRetryCountValues).toEqual([undefined, 1, 2])
    })

    it('delay 为 0 时立即重试不等待', async () => {
        const networkError = new Error('error')
        let callCount = 0
        const adapter: Adapter = {
            request: vi.fn(async (config: RequestConfig) => {
                callCount++
                if (callCount === 1) throw networkError
                return {
                    data: 'ok',
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    config,
                }
            }),
        }
        const engine = createRequest({
            adapter,
            plugins: [retryPlugin({ maxRetries: 1, delay: 0 })],
        })

        const res = await engine.get('/users')

        expect(res.data).toBe('ok')
        expect(adapter.request).toHaveBeenCalledTimes(2)
    })
})
