import { describe, it, expect, vi } from 'vitest'

import { createRequest } from '@/core/engine'
import { racePlugin } from '@/plugins/race'

import type { Adapter, RequestConfig, Response } from '@/core/types'

function createAbortableAdapter(delayMs: number): Adapter {
    return {
        request: vi.fn(
            async (config: RequestConfig) =>
                new Promise<Response>((resolve, reject) => {
                    const timer = setTimeout(() => {
                        resolve({
                            data: config.url,
                            status: 200,
                            statusText: 'OK',
                            headers: {},
                            config,
                        })
                    }, delayMs)

                    config.signal?.addEventListener(
                        'abort',
                        () => {
                            clearTimeout(timer)
                            reject(
                                config.signal!.reason ??
                                    new DOMException(
                                        'The operation was aborted.',
                                        'AbortError'
                                    )
                            )
                        },
                        { once: true }
                    )
                })
        ),
    }
}

describe('racePlugin', () => {
    it('快速连发两个相同 raceKey 请求 → 第一个被 abort，第二个正常完成', async () => {
        vi.useFakeTimers()

        try {
            const adapter = createAbortableAdapter(100)
            const engine = createRequest({
                adapter,
                plugins: [racePlugin()],
            })

            const p1 = engine
                .get('/users', { meta: { raceKey: 'list' } })
                .catch((e: unknown) => e)
            const p2 = engine.get('/users', { meta: { raceKey: 'list' } })

            await vi.advanceTimersByTimeAsync(100)

            const r1 = await p1
            const r2 = await p2

            expect(r1).toBeInstanceOf(DOMException)
            expect((r1 as DOMException).name).toBe('AbortError')
            expect(r2.data).toBe('/users')
        } finally {
            vi.useRealTimers()
        }
    })

    it('没有 raceKey 的请求不受影响', async () => {
        vi.useFakeTimers()

        try {
            const adapter = createAbortableAdapter(100)
            const engine = createRequest({
                adapter,
                plugins: [racePlugin()],
            })

            const p1 = engine.get('/users')
            const p2 = engine.get('/users')

            await vi.advanceTimersByTimeAsync(100)
            const [r1, r2] = await Promise.all([p1, p2])

            expect(adapter.request).toHaveBeenCalledTimes(2)
            expect(r1.data).toBe('/users')
            expect(r2.data).toBe('/users')
        } finally {
            vi.useRealTimers()
        }
    })

    it('不同 raceKey 互不干扰', async () => {
        vi.useFakeTimers()

        try {
            const adapter = createAbortableAdapter(100)
            const engine = createRequest({
                adapter,
                plugins: [racePlugin()],
            })

            const p1 = engine.get('/users', { meta: { raceKey: 'a' } })
            const p2 = engine.get('/posts', { meta: { raceKey: 'b' } })

            await vi.advanceTimersByTimeAsync(100)
            const [r1, r2] = await Promise.all([p1, p2])

            expect(r1.data).toBe('/users')
            expect(r2.data).toBe('/posts')
        } finally {
            vi.useRealTimers()
        }
    })

    it('自定义 generateKey 生效', async () => {
        vi.useFakeTimers()

        try {
            const adapter = createAbortableAdapter(100)
            const engine = createRequest({
                adapter,
                plugins: [
                    racePlugin({
                        generateKey: config => config.url,
                    }),
                ],
            })

            const p1 = engine
                .get('/users')
                .catch((e: unknown) => e)
            const p2 = engine.get('/users')

            await vi.advanceTimersByTimeAsync(100)

            const r1 = await p1
            const r2 = await p2

            expect(r1).toBeInstanceOf(DOMException)
            expect((r1 as DOMException).name).toBe('AbortError')
            expect(r2.data).toBe('/users')
        } finally {
            vi.useRealTimers()
        }
    })

    it('被取消的请求抛出 AbortError', async () => {
        vi.useFakeTimers()

        try {
            const adapter = createAbortableAdapter(100)
            const engine = createRequest({
                adapter,
                plugins: [racePlugin()],
            })

            const p1 = engine
                .get('/users', { meta: { raceKey: 'k' } })
                .catch((e: unknown) => e)

            engine.get('/users', { meta: { raceKey: 'k' } })

            await vi.advanceTimersByTimeAsync(100)
            const result = await p1

            expect(result).toBeInstanceOf(DOMException)
            expect((result as DOMException).name).toBe('AbortError')
        } finally {
            vi.useRealTimers()
        }
    })

    it('连发三个相同 raceKey 请求 → 只有最后一个成功', async () => {
        vi.useFakeTimers()

        try {
            const adapter = createAbortableAdapter(100)
            const engine = createRequest({
                adapter,
                plugins: [racePlugin()],
            })

            const p1 = engine
                .get('/a', { meta: { raceKey: 'k' } })
                .catch((e: unknown) => e)
            const p2 = engine
                .get('/b', { meta: { raceKey: 'k' } })
                .catch((e: unknown) => e)
            const p3 = engine.get('/c', { meta: { raceKey: 'k' } })

            await vi.advanceTimersByTimeAsync(100)

            const [r1, r2, r3] = await Promise.all([p1, p2, p3])

            expect(r1).toBeInstanceOf(DOMException)
            expect(r2).toBeInstanceOf(DOMException)
            expect(r3.data).toBe('/c')
        } finally {
            vi.useRealTimers()
        }
    })

    it('前序请求完成后再发请求 → 两个都正常完成', async () => {
        vi.useFakeTimers()

        try {
            const adapter = createAbortableAdapter(100)
            const engine = createRequest({
                adapter,
                plugins: [racePlugin()],
            })

            const p1 = engine.get('/users', { meta: { raceKey: 'k' } })
            await vi.advanceTimersByTimeAsync(100)
            const r1 = await p1

            const p2 = engine.get('/users', { meta: { raceKey: 'k' } })
            await vi.advanceTimersByTimeAsync(100)
            const r2 = await p2

            expect(r1.data).toBe('/users')
            expect(r2.data).toBe('/users')
            expect(adapter.request).toHaveBeenCalledTimes(2)
        } finally {
            vi.useRealTimers()
        }
    })

    it('config 已有 signal 时能正确合并', async () => {
        vi.useFakeTimers()

        try {
            const adapter = createAbortableAdapter(100)
            const engine = createRequest({
                adapter,
                plugins: [racePlugin()],
            })

            const externalController = new AbortController()
            const p1 = engine
                .get('/users', {
                    meta: { raceKey: 'k' },
                    signal: externalController.signal,
                })
                .catch((e: unknown) => e)

            externalController.abort()

            await vi.advanceTimersByTimeAsync(100)
            const result = await p1

            expect(result).toBeInstanceOf(DOMException)
        } finally {
            vi.useRealTimers()
        }
    })
})
