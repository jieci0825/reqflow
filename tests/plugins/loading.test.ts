import { describe, it, expect, vi } from 'vitest'

import { createRequest } from '@/core/engine'
import { loadingPlugin } from '@/plugins/loading'

import type { Adapter, RequestConfig, Response } from '@/core/types'

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

describe('loadingPlugin', () => {
    it('单个请求触发 onShow → 完成后触发 onHide', async () => {
        const onShow = vi.fn()
        const onHide = vi.fn()
        const adapter = createMockAdapter({ data: 'ok' })
        const engine = createRequest({
            adapter,
            plugins: [loadingPlugin({ onShow, onHide })],
        })

        await engine.get('/users')

        expect(onShow).toHaveBeenCalledOnce()
        expect(onHide).toHaveBeenCalledOnce()
    })

    it('并发两个请求：onShow 只调一次，两个都完成后 onHide 才调', async () => {
        vi.useFakeTimers()

        try {
            const onShow = vi.fn()
            const onHide = vi.fn()
            const adapter = createDelayedAdapter(100)
            const engine = createRequest({
                adapter,
                plugins: [loadingPlugin({ onShow, onHide })],
            })

            const p1 = engine.get('/a')
            const p2 = engine.get('/b')

            expect(onShow).toHaveBeenCalledOnce()
            expect(onHide).not.toHaveBeenCalled()

            await vi.advanceTimersByTimeAsync(100)
            await Promise.all([p1, p2])

            expect(onShow).toHaveBeenCalledOnce()
            expect(onHide).toHaveBeenCalledOnce()
        } finally {
            vi.useRealTimers()
        }
    })

    it('delay 场景：请求在 delay 内完成 → onShow 和 onHide 均不调用', async () => {
        vi.useFakeTimers()

        try {
            const onShow = vi.fn()
            const onHide = vi.fn()
            const adapter = createDelayedAdapter(50)
            const engine = createRequest({
                adapter,
                plugins: [loadingPlugin({ onShow, onHide, delay: 200 })],
            })

            const promise = engine.get('/fast')

            await vi.advanceTimersByTimeAsync(50)
            await promise

            expect(onShow).not.toHaveBeenCalled()
            expect(onHide).not.toHaveBeenCalled()
        } finally {
            vi.useRealTimers()
        }
    })

    it('delay 场景：请求超过 delay → onShow 被调用', async () => {
        vi.useFakeTimers()

        try {
            const onShow = vi.fn()
            const onHide = vi.fn()
            const adapter = createDelayedAdapter(500)
            const engine = createRequest({
                adapter,
                plugins: [loadingPlugin({ onShow, onHide, delay: 100 })],
            })

            const promise = engine.get('/slow')

            expect(onShow).not.toHaveBeenCalled()

            await vi.advanceTimersByTimeAsync(100)
            expect(onShow).toHaveBeenCalledOnce()
            expect(onHide).not.toHaveBeenCalled()

            await vi.advanceTimersByTimeAsync(400)
            await promise

            expect(onHide).toHaveBeenCalledOnce()
        } finally {
            vi.useRealTimers()
        }
    })

    it('meta.silent 标记的请求不触发 loading', async () => {
        const onShow = vi.fn()
        const onHide = vi.fn()
        const adapter = createMockAdapter({ data: 'ok' })
        const engine = createRequest({
            adapter,
            plugins: [loadingPlugin({ onShow, onHide })],
        })

        await engine.get('/silent', { meta: { silent: true } })

        expect(onShow).not.toHaveBeenCalled()
        expect(onHide).not.toHaveBeenCalled()
    })

    it('请求异常时也能正确 hide（finally 分支）', async () => {
        const onShow = vi.fn()
        const onHide = vi.fn()
        const adapter: Adapter = {
            request: vi.fn(async () => {
                throw new Error('network error')
            }),
        }
        const engine = createRequest({
            adapter,
            plugins: [loadingPlugin({ onShow, onHide })],
        })

        await expect(engine.get('/fail')).rejects.toThrow('network error')

        expect(onShow).toHaveBeenCalledOnce()
        expect(onHide).toHaveBeenCalledOnce()
    })

    it('并发请求中混合 silent 和普通请求，计数正确', async () => {
        vi.useFakeTimers()

        try {
            const onShow = vi.fn()
            const onHide = vi.fn()
            const adapter = createDelayedAdapter(100)
            const engine = createRequest({
                adapter,
                plugins: [loadingPlugin({ onShow, onHide })],
            })

            const p1 = engine.get('/a')
            const p2 = engine.get('/b', { meta: { silent: true } })
            const p3 = engine.get('/c')

            expect(onShow).toHaveBeenCalledOnce()

            await vi.advanceTimersByTimeAsync(100)
            await Promise.all([p1, p2, p3])

            expect(onShow).toHaveBeenCalledOnce()
            expect(onHide).toHaveBeenCalledOnce()
        } finally {
            vi.useRealTimers()
        }
    })

    it('delay 场景：并发请求全部在 delay 窗口内完成 → 不触发 show/hide', async () => {
        vi.useFakeTimers()

        try {
            const onShow = vi.fn()
            const onHide = vi.fn()
            const adapter = createDelayedAdapter(30)
            const engine = createRequest({
                adapter,
                plugins: [loadingPlugin({ onShow, onHide, delay: 200 })],
            })

            const p1 = engine.get('/a')
            const p2 = engine.get('/b')

            await vi.advanceTimersByTimeAsync(30)
            await Promise.all([p1, p2])

            expect(onShow).not.toHaveBeenCalled()
            expect(onHide).not.toHaveBeenCalled()
        } finally {
            vi.useRealTimers()
        }
    })

    it('仅 silent 请求时不触发 loading，即使有多个并发', async () => {
        const onShow = vi.fn()
        const onHide = vi.fn()
        const adapter = createMockAdapter({ data: 'ok' })
        const engine = createRequest({
            adapter,
            plugins: [loadingPlugin({ onShow, onHide })],
        })

        await Promise.all([
            engine.get('/a', { meta: { silent: true } }),
            engine.get('/b', { meta: { silent: true } }),
        ])

        expect(onShow).not.toHaveBeenCalled()
        expect(onHide).not.toHaveBeenCalled()
    })
})
