import { describe, it, expect, vi } from 'vitest'

import { fetchAdapter } from '@/adapters/fetch'
import { createRequest } from '@/core/engine'
import { errorPlugin } from '@/plugins/error'

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

describe('errorPlugin', () => {
    it('HTTP 错误（如 500）触发 onError 回调', async () => {
        const onError = vi.fn()
        const adapter = createMockAdapter({
            status: 500,
            statusText: 'Internal Server Error',
        })
        const engine = createRequest({
            adapter,
            plugins: [errorPlugin({ onError })],
        })

        await engine.get('/users')

        expect(onError).toHaveBeenCalledOnce()
        const error: RequestError = onError.mock.calls[0][0]
        expect(error.type).toBe('http')
        expect(error.status).toBe(500)
        expect(error.message).toBe('HTTP Error 500: Internal Server Error')
        expect(error.response).toBeDefined()
        expect(error.response!.status).toBe(500)
    })

    it('4xx 状态码同样触发 onError 回调', async () => {
        const onError = vi.fn()
        const adapter = createMockAdapter({
            status: 404,
            statusText: 'Not Found',
        })
        const engine = createRequest({
            adapter,
            plugins: [errorPlugin({ onError })],
        })

        await engine.get('/not-exist')

        expect(onError).toHaveBeenCalledOnce()
        const error: RequestError = onError.mock.calls[0][0]
        expect(error.type).toBe('http')
        expect(error.status).toBe(404)
    })

    it('网络异常触发 onError', async () => {
        const onError = vi.fn()
        const networkError = new TypeError('Failed to fetch')
        const adapter: Adapter = {
            request: vi.fn(async () => {
                throw networkError
            }),
        }
        const engine = createRequest({
            adapter,
            plugins: [errorPlugin({ onError })],
        })

        await expect(engine.get('/users')).rejects.toThrow('Failed to fetch')

        expect(onError).toHaveBeenCalledOnce()
        const error: RequestError = onError.mock.calls[0][0]
        expect(error.type).toBe('network')
        expect(error.message).toBe('Failed to fetch')
        expect(error.cause).toBe(networkError)
    })

    it('网络异常触发 onError 后仍然抛出原始错误', async () => {
        const onError = vi.fn()
        const networkError = new TypeError('Failed to fetch')
        const adapter: Adapter = {
            request: vi.fn(async () => {
                throw networkError
            }),
        }
        const engine = createRequest({
            adapter,
            plugins: [errorPlugin({ onError })],
        })

        await expect(engine.get('/users')).rejects.toThrow(networkError)
    })

    it('中间件执行异常会被识别为 runtime', async () => {
        const onError = vi.fn()
        const runtimeError = new Error('middleware crashed')
        const engine = createRequest({
            adapter: createMockAdapter(),
            plugins: [errorPlugin({ onError })],
        })

        await expect(
            engine.get('/users', {
                middleware: [
                    async () => {
                        throw runtimeError
                    },
                ],
            })
        ).rejects.toThrow(runtimeError)

        expect(onError).toHaveBeenCalledOnce()
        const error: RequestError = onError.mock.calls[0][0]
        expect(error.type).toBe('runtime')
        expect(error.message).toBe('middleware crashed')
        expect(error.cause).toBe(runtimeError)
    })

    it('skipCodes 配置的状态码不触发回调', async () => {
        const onError = vi.fn()
        const adapter = createMockAdapter({
            status: 404,
            statusText: 'Not Found',
        })
        const engine = createRequest({
            adapter,
            plugins: [errorPlugin({ onError, skipCodes: [404] })],
        })

        await engine.get('/not-exist')

        expect(onError).not.toHaveBeenCalled()
    })

    it('skipCodes 可配置多个状态码', async () => {
        const onError = vi.fn()
        const adapter = createMockAdapter({
            status: 403,
            statusText: 'Forbidden',
        })
        const engine = createRequest({
            adapter,
            plugins: [
                errorPlugin({ onError, skipCodes: [401, 403, 404] }),
            ],
        })

        await engine.get('/forbidden')

        expect(onError).not.toHaveBeenCalled()
    })

    it('skipCodes 不影响未列入的状态码', async () => {
        const onError = vi.fn()
        const adapter = createMockAdapter({
            status: 500,
            statusText: 'Internal Server Error',
        })
        const engine = createRequest({
            adapter,
            plugins: [errorPlugin({ onError, skipCodes: [404] })],
        })

        await engine.get('/users')

        expect(onError).toHaveBeenCalledOnce()
        expect(onError.mock.calls[0][0].status).toBe(500)
    })

    it('2xx/3xx 状态码不触发 onError', async () => {
        const onError = vi.fn()
        const adapter = createMockAdapter({ status: 200, statusText: 'OK' })
        const engine = createRequest({
            adapter,
            plugins: [errorPlugin({ onError })],
        })

        await engine.get('/users')

        expect(onError).not.toHaveBeenCalled()
    })

    it('错误回调中包含正确的请求配置', async () => {
        const onError = vi.fn()
        const adapter = createMockAdapter({
            status: 502,
            statusText: 'Bad Gateway',
        })
        const engine = createRequest({
            adapter,
            baseURL: 'https://api.example.com',
            plugins: [errorPlugin({ onError })],
        })

        await engine.post('/submit', { name: 'test' })

        expect(onError).toHaveBeenCalledOnce()
        const error: RequestError = onError.mock.calls[0][0]
        expect(error.config.method).toBe('POST')
        expect(error.config.url).toContain('/submit')
    })

    it('HTTP 错误时仍然返回响应对象', async () => {
        const onError = vi.fn()
        const adapter = createMockAdapter({
            status: 500,
            statusText: 'Internal Server Error',
            data: { error: 'something went wrong' },
        })
        const engine = createRequest({
            adapter,
            plugins: [errorPlugin({ onError })],
        })

        const response = await engine.get('/users')

        expect(response.status).toBe(500)
        expect(response.data).toEqual({ error: 'something went wrong' })
    })

    it('非 Error 类型的网络异常也能正常处理', async () => {
        const onError = vi.fn()
        const adapter: Adapter = {
            request: vi.fn(async () => {
                throw 'string error'
            }),
        }
        const engine = createRequest({
            adapter,
            plugins: [errorPlugin({ onError })],
        })

        await expect(engine.get('/users')).rejects.toThrow()

        expect(onError).toHaveBeenCalledOnce()
        const error: RequestError = onError.mock.calls[0][0]
        expect(error.type).toBe('network')
        expect(error.message).toBe('string error')
        expect(error.cause).toBeInstanceOf(Error)
    })

    it('请求序列化异常会被识别为 runtime', async () => {
        const onError = vi.fn()
        const circular: Record<string, any> = {}
        circular.self = circular

        vi.stubGlobal('fetch', vi.fn())

        try {
            const engine = createRequest({
                adapter: fetchAdapter(),
                plugins: [errorPlugin({ onError })],
            })

            await expect(engine.post('/users', circular)).rejects.toThrow()

            expect(onError).toHaveBeenCalledOnce()
            const error: RequestError = onError.mock.calls[0][0]
            expect(error.type).toBe('runtime')
            expect(error.message).toContain('circular')
            expect(error.cause).toBeInstanceOf(TypeError)
        } finally {
            vi.unstubAllGlobals()
        }
    })
})
