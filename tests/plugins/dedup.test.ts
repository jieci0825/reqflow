import { describe, it, expect, vi } from 'vitest'

import { createRequest } from '@/core/engine'
import { dedupPlugin } from '@/plugins/dedup'

import type { Adapter, RequestConfig, Response } from '@/core/types'

function createDelayedAdapter(delayMs: number): Adapter {
    return {
        request: vi.fn(
            async (config: RequestConfig) =>
                new Promise<Response>(resolve => {
                    setTimeout(() => {
                        resolve({
                            data: 'ok',
                            status: 200,
                            statusText: 'OK',
                            headers: {},
                            config,
                        })
                    }, delayMs)
                })
        ),
    }
}

function createFailingDelayedAdapter(delayMs: number): Adapter {
    return {
        request: vi.fn(
            async () =>
                new Promise<Response>((_, reject) => {
                    setTimeout(() => {
                        reject(new Error('network error'))
                    }, delayMs)
                })
        ),
    }
}

describe('dedupPlugin', () => {
    it('同时发两个相同请求 → adapter 只被调用一次，两个 Promise resolve 相同结果', async () => {
        vi.useFakeTimers()

        try {
            const adapter = createDelayedAdapter(100)
            const engine = createRequest({
                adapter,
                plugins: [dedupPlugin()],
            })

            const p1 = engine.get('/users')
            const p2 = engine.get('/users')

            await vi.advanceTimersByTimeAsync(100)
            const [r1, r2] = await Promise.all([p1, p2])

            expect(adapter.request).toHaveBeenCalledOnce()
            expect(r1).toBe(r2)
            expect(r1.data).toBe('ok')
        } finally {
            vi.useRealTimers()
        }
    })

    it('两个不同请求 → adapter 被调用两次', async () => {
        vi.useFakeTimers()

        try {
            const adapter = createDelayedAdapter(100)
            const engine = createRequest({
                adapter,
                plugins: [dedupPlugin()],
            })

            const p1 = engine.get('/users')
            const p2 = engine.get('/posts')

            await vi.advanceTimersByTimeAsync(100)
            await Promise.all([p1, p2])

            expect(adapter.request).toHaveBeenCalledTimes(2)
        } finally {
            vi.useRealTimers()
        }
    })

    it('第一个请求完成后再发相同请求 → adapter 被调用两次（已释放）', async () => {
        vi.useFakeTimers()

        try {
            const adapter = createDelayedAdapter(100)
            const engine = createRequest({
                adapter,
                plugins: [dedupPlugin()],
            })

            const p1 = engine.get('/users')
            await vi.advanceTimersByTimeAsync(100)
            await p1

            expect(adapter.request).toHaveBeenCalledOnce()

            const p2 = engine.get('/users')
            await vi.advanceTimersByTimeAsync(100)
            await p2

            expect(adapter.request).toHaveBeenCalledTimes(2)
        } finally {
            vi.useRealTimers()
        }
    })

    it('自定义 generateKey 生效', async () => {
        vi.useFakeTimers()

        try {
            const adapter = createDelayedAdapter(100)
            const engine = createRequest({
                adapter,
                plugins: [
                    dedupPlugin({
                        generateKey: config => config.url,
                    }),
                ],
            })

            const p1 = engine.get('/users', { params: { page: 1 } })
            const p2 = engine.get('/users', { params: { page: 2 } })

            await vi.advanceTimersByTimeAsync(100)
            const [r1, r2] = await Promise.all([p1, p2])

            expect(adapter.request).toHaveBeenCalledOnce()
            expect(r1).toBe(r2)
        } finally {
            vi.useRealTimers()
        }
    })

    it('meta.dedup === false 跳过去重', async () => {
        vi.useFakeTimers()

        try {
            const adapter = createDelayedAdapter(100)
            const engine = createRequest({
                adapter,
                plugins: [dedupPlugin()],
            })

            const p1 = engine.get('/users')
            const p2 = engine.get('/users', { meta: { dedup: false } })

            await vi.advanceTimersByTimeAsync(100)
            await Promise.all([p1, p2])

            expect(adapter.request).toHaveBeenCalledTimes(2)
        } finally {
            vi.useRealTimers()
        }
    })

    it('第一个请求失败 → 共享该 Promise 的所有调用者都收到同一个 rejection', async () => {
        vi.useFakeTimers()

        try {
            const adapter = createFailingDelayedAdapter(100)
            const engine = createRequest({
                adapter,
                plugins: [dedupPlugin()],
            })

            const p1 = engine.get('/users').catch((e: Error) => e)
            const p2 = engine.get('/users').catch((e: Error) => e)

            await vi.advanceTimersByTimeAsync(100)

            const [r1, r2] = await Promise.all([p1, p2])

            expect(r1).toBeInstanceOf(Error)
            expect((r1 as Error).message).toBe('network error')
            expect(r2).toBeInstanceOf(Error)
            expect((r2 as Error).message).toBe('network error')
            expect(adapter.request).toHaveBeenCalledOnce()
        } finally {
            vi.useRealTimers()
        }
    })

    it('不同 method 的相同 url 不会去重', async () => {
        vi.useFakeTimers()

        try {
            const adapter = createDelayedAdapter(100)
            const engine = createRequest({
                adapter,
                plugins: [dedupPlugin()],
            })

            const p1 = engine.get('/users')
            const p2 = engine.post('/users')

            await vi.advanceTimersByTimeAsync(100)
            await Promise.all([p1, p2])

            expect(adapter.request).toHaveBeenCalledTimes(2)
        } finally {
            vi.useRealTimers()
        }
    })

    it('相同 url 不同 params 不会去重', async () => {
        vi.useFakeTimers()

        try {
            const adapter = createDelayedAdapter(100)
            const engine = createRequest({
                adapter,
                plugins: [dedupPlugin()],
            })

            const p1 = engine.get('/users', { params: { page: 1 } })
            const p2 = engine.get('/users', { params: { page: 2 } })

            await vi.advanceTimersByTimeAsync(100)
            await Promise.all([p1, p2])

            expect(adapter.request).toHaveBeenCalledTimes(2)
        } finally {
            vi.useRealTimers()
        }
    })
})
