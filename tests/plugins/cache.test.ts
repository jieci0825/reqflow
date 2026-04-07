import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { createRequest } from '@/core/engine'
import { cachePlugin } from '@/plugins/cache'

import type { Adapter, RequestConfig, Response } from '@/core/types'

function createMockAdapter(): Adapter {
    let callCount = 0
    return {
        request: vi.fn(async (config: RequestConfig): Promise<Response> => {
            callCount++
            return {
                data: { id: callCount },
                status: 200,
                statusText: 'OK',
                headers: {},
                config,
            }
        }),
    }
}

describe('cachePlugin', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('首次请求走 adapter，第二次请求命中缓存（adapter 只调用一次）', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({
            adapter,
            plugins: [cachePlugin({ ttl: 5000 })],
        })

        const r1 = await engine.get('/users')
        const r2 = await engine.get('/users')

        expect(adapter.request).toHaveBeenCalledOnce()
        expect(r1.data).toEqual({ id: 1 })
        expect(r2.data).toEqual({ id: 1 })
    })

    it('TTL 过期后再次请求走 adapter', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({
            adapter,
            plugins: [cachePlugin({ ttl: 5000 })],
        })

        await engine.get('/users')
        expect(adapter.request).toHaveBeenCalledOnce()

        vi.advanceTimersByTime(5001)

        const r2 = await engine.get('/users')
        expect(adapter.request).toHaveBeenCalledTimes(2)
        expect(r2.data).toEqual({ id: 2 })
    })

    it('非 GET 方法默认不缓存', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({
            adapter,
            plugins: [cachePlugin({ ttl: 5000 })],
        })

        await engine.post('/users', { name: 'Alice' })
        await engine.post('/users', { name: 'Alice' })

        expect(adapter.request).toHaveBeenCalledTimes(2)
    })

    it('自定义 methods 可缓存 POST', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({
            adapter,
            plugins: [cachePlugin({ ttl: 5000, methods: ['POST'] })],
        })

        await engine.post('/users', { name: 'Alice' })
        await engine.post('/users', { name: 'Alice' })

        expect(adapter.request).toHaveBeenCalledOnce()
    })

    it('exclude 返回 true 跳过缓存', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({
            adapter,
            plugins: [
                cachePlugin({
                    ttl: 5000,
                    exclude: config => config.url.includes('/no-cache'),
                }),
            ],
        })

        await engine.get('/no-cache/data')
        await engine.get('/no-cache/data')

        expect(adapter.request).toHaveBeenCalledTimes(2)
    })

    it('meta.cache === false 强制跳过缓存', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({
            adapter,
            plugins: [cachePlugin({ ttl: 5000 })],
        })

        await engine.get('/users')
        await engine.get('/users', { meta: { cache: false } })

        expect(adapter.request).toHaveBeenCalledTimes(2)
    })

    it('缓存返回的是深拷贝，修改不影响下次读取', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({
            adapter,
            plugins: [cachePlugin({ ttl: 5000 })],
        })

        const r1 = await engine.get('/users')
        r1.data.id = 999

        const r2 = await engine.get('/users')

        expect(adapter.request).toHaveBeenCalledOnce()
        expect(r2.data).toEqual({ id: 1 })
    })

    it('自定义 generateKey 生效', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({
            adapter,
            plugins: [
                cachePlugin({
                    ttl: 5000,
                    generateKey: config => config.url,
                }),
            ],
        })

        await engine.get('/users', { params: { page: 1 } })
        await engine.get('/users', { params: { page: 2 } })

        expect(adapter.request).toHaveBeenCalledOnce()
    })

    it('不同 URL 的 GET 请求各自独立缓存', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({
            adapter,
            plugins: [cachePlugin({ ttl: 5000 })],
        })

        const r1 = await engine.get('/users')
        const r2 = await engine.get('/posts')

        expect(adapter.request).toHaveBeenCalledTimes(2)
        expect(r1.data).toEqual({ id: 1 })
        expect(r2.data).toEqual({ id: 2 })
    })

    it('相同 URL 不同 params 各自独立缓存', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({
            adapter,
            plugins: [cachePlugin({ ttl: 5000 })],
        })

        const r1 = await engine.get('/users', { params: { page: 1 } })
        const r2 = await engine.get('/users', { params: { page: 2 } })

        expect(adapter.request).toHaveBeenCalledTimes(2)
        expect(r1.data).toEqual({ id: 1 })
        expect(r2.data).toEqual({ id: 2 })
    })
})
