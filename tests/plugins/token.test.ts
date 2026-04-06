import { describe, it, expect, vi } from 'vitest'

import { createRequest } from '@/core/engine'
import { tokenPlugin } from '@/plugins/token'

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

describe('tokenPlugin', () => {
    it('请求头中被正确注入 Authorization: Bearer xxx', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({
            adapter,
            plugins: [tokenPlugin({ getToken: () => 'my-token' })],
        })

        await engine.get('/users')

        expect(adapter.request).toHaveBeenCalledWith(
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer my-token',
                }),
            })
        )
    })

    it('getToken 返回 null 时不注入', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({
            adapter,
            plugins: [tokenPlugin({ getToken: () => null })],
        })

        await engine.get('/users')

        const calledConfig = (adapter.request as ReturnType<typeof vi.fn>)
            .mock.calls[0][0] as RequestConfig
        expect(calledConfig.headers).toBeUndefined()
    })

    it('getToken 返回 undefined 时不注入', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({
            adapter,
            plugins: [tokenPlugin({ getToken: () => undefined })],
        })

        await engine.get('/users')

        const calledConfig = (adapter.request as ReturnType<typeof vi.fn>)
            .mock.calls[0][0] as RequestConfig
        expect(calledConfig.headers).toBeUndefined()
    })

    it('自定义 headerKey 生效', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({
            adapter,
            plugins: [
                tokenPlugin({
                    getToken: () => 'my-token',
                    headerKey: 'X-Access-Token',
                }),
            ],
        })

        await engine.get('/users')

        expect(adapter.request).toHaveBeenCalledWith(
            expect.objectContaining({
                headers: expect.objectContaining({
                    'X-Access-Token': 'Bearer my-token',
                }),
            })
        )
    })

    it('自定义 prefix 生效', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({
            adapter,
            plugins: [
                tokenPlugin({
                    getToken: () => 'my-token',
                    prefix: 'Token',
                }),
            ],
        })

        await engine.get('/users')

        expect(adapter.request).toHaveBeenCalledWith(
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Token my-token',
                }),
            })
        )
    })

    it('prefix 为空字符串时直接使用 token 作为值', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({
            adapter,
            plugins: [
                tokenPlugin({
                    getToken: () => 'raw-token-value',
                    prefix: '',
                }),
            ],
        })

        await engine.get('/users')

        expect(adapter.request).toHaveBeenCalledWith(
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'raw-token-value',
                }),
            })
        )
    })

    it('同时自定义 headerKey 和 prefix', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({
            adapter,
            plugins: [
                tokenPlugin({
                    getToken: () => 'abc123',
                    headerKey: 'X-Auth',
                    prefix: 'Basic',
                }),
            ],
        })

        await engine.get('/users')

        expect(adapter.request).toHaveBeenCalledWith(
            expect.objectContaining({
                headers: expect.objectContaining({
                    'X-Auth': 'Basic abc123',
                }),
            })
        )
    })

    it('不覆盖已有的其他请求头', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({
            adapter,
            headers: { 'Content-Type': 'application/json' },
            plugins: [tokenPlugin({ getToken: () => 'my-token' })],
        })

        await engine.get('/users')

        expect(adapter.request).toHaveBeenCalledWith(
            expect.objectContaining({
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer my-token',
                }),
            })
        )
    })

    it('每次请求动态获取 token', async () => {
        const adapter = createMockAdapter()
        let currentToken: string | null = 'token-1'

        const engine = createRequest({
            adapter,
            plugins: [tokenPlugin({ getToken: () => currentToken })],
        })

        await engine.get('/first')
        expect(adapter.request).toHaveBeenCalledWith(
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer token-1',
                }),
            })
        )

        currentToken = 'token-2'
        await engine.get('/second')
        expect(adapter.request).toHaveBeenLastCalledWith(
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer token-2',
                }),
            })
        )

        currentToken = null
        await engine.get('/third')
        const thirdCallConfig = (adapter.request as ReturnType<typeof vi.fn>)
            .mock.calls[2][0] as RequestConfig
        expect(thirdCallConfig.headers?.Authorization).toBeUndefined()
    })
})
