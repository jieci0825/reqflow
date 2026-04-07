import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { createRequest } from '@/core/engine'
import { dualTokenPlugin } from '@/plugins/dual-token'

import type { Adapter, RequestConfig, Response } from '@/core/types'

let accessToken = 'access-1'
let refreshToken = 'refresh-1'

function createMockAdapter(options?: {
    unauthorizedOnce?: boolean
    alwaysUnauthorized?: boolean
}): Adapter {
    let firstCall = true

    return {
        request: vi.fn(async (config: RequestConfig): Promise<Response> => {
            if (options?.alwaysUnauthorized) {
                return {
                    data: null,
                    status: 401,
                    statusText: 'Unauthorized',
                    headers: {},
                    config,
                }
            }

            if (options?.unauthorizedOnce && firstCall) {
                firstCall = false
                return {
                    data: null,
                    status: 401,
                    statusText: 'Unauthorized',
                    headers: {},
                    config,
                }
            }

            return {
                data: { success: true },
                status: 200,
                statusText: 'OK',
                headers: {},
                config,
            }
        }),
    }
}

function setupFetchMock(success: boolean) {
    return vi.fn(async () => {
        if (!success) {
            return { ok: false, status: 401, json: async () => ({}) } as globalThis.Response
        }

        return {
            ok: true,
            status: 200,
            json: async () => ({ access: 'access-new', refresh: 'refresh-new' }),
        } as globalThis.Response
    })
}

describe('dualTokenPlugin', () => {
    const originalFetch = globalThis.fetch

    beforeEach(() => {
        accessToken = 'access-1'
        refreshToken = 'refresh-1'
    })

    afterEach(() => {
        globalThis.fetch = originalFetch
    })

    it('正常请求（非 401）直接返回', async () => {
        const adapter = createMockAdapter()
        const onRefreshSuccess = vi.fn()
        const onRefreshFail = vi.fn()

        const engine = createRequest({
            adapter,
            plugins: [
                dualTokenPlugin({
                    getAccessToken: () => accessToken,
                    getRefreshToken: () => refreshToken,
                    refreshURL: '/auth/refresh',
                    onRefreshSuccess,
                    onRefreshFail,
                }),
            ],
        })

        const res = await engine.get('/users')

        expect(res.status).toBe(200)
        expect(res.data).toEqual({ success: true })
        expect(onRefreshSuccess).not.toHaveBeenCalled()
        expect(onRefreshFail).not.toHaveBeenCalled()
    })

    it('请求头中被正确注入 access token', async () => {
        const adapter = createMockAdapter()

        const engine = createRequest({
            adapter,
            plugins: [
                dualTokenPlugin({
                    getAccessToken: () => 'my-access-token',
                    getRefreshToken: () => refreshToken,
                    refreshURL: '/auth/refresh',
                    onRefreshSuccess: vi.fn(),
                    onRefreshFail: vi.fn(),
                }),
            ],
        })

        await engine.get('/users')

        expect(adapter.request).toHaveBeenCalledWith(
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer my-access-token',
                }),
            })
        )
    })

    it('401 时触发刷新 → 刷新成功 → 原请求用新 token 重试成功', async () => {
        const fetchMock = setupFetchMock(true)
        globalThis.fetch = fetchMock

        const adapter = createMockAdapter({ unauthorizedOnce: true })
        const onRefreshSuccess = vi.fn((tokens) => {
            accessToken = tokens.access
        })

        const engine = createRequest({
            adapter,
            plugins: [
                dualTokenPlugin({
                    getAccessToken: () => accessToken,
                    getRefreshToken: () => refreshToken,
                    refreshURL: '/auth/refresh',
                    onRefreshSuccess,
                    onRefreshFail: vi.fn(),
                }),
            ],
        })

        const res = await engine.get('/users')

        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(onRefreshSuccess).toHaveBeenCalledWith({ access: 'access-new', refresh: 'refresh-new' })
        expect(adapter.request).toHaveBeenCalledTimes(2)
        expect(res.status).toBe(200)
        expect(res.data).toEqual({ success: true })

        const retryConfig = (adapter.request as ReturnType<typeof vi.fn>).mock.calls[1][0] as RequestConfig
        expect(retryConfig.headers?.Authorization).toBe('Bearer access-new')
    })

    it('并发多个 401 请求 → 只调用一次刷新接口，所有请求都在刷新后重试', async () => {
        let callCount = 0
        const adapter: Adapter = {
            request: vi.fn(async (config: RequestConfig): Promise<Response> => {
                callCount++
                if (callCount <= 3) {
                    return {
                        data: null,
                        status: 401,
                        statusText: 'Unauthorized',
                        headers: {},
                        config,
                    }
                }
                return {
                    data: { id: config.url },
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    config,
                }
            }),
        }

        const fetchMock = setupFetchMock(true)
        globalThis.fetch = fetchMock

        const onRefreshSuccess = vi.fn((tokens) => {
            accessToken = tokens.access
        })

        const engine = createRequest({
            adapter,
            plugins: [
                dualTokenPlugin({
                    getAccessToken: () => accessToken,
                    getRefreshToken: () => refreshToken,
                    refreshURL: '/auth/refresh',
                    onRefreshSuccess,
                    onRefreshFail: vi.fn(),
                }),
            ],
        })

        const [r1, r2, r3] = await Promise.all([
            engine.get('/a'),
            engine.get('/b'),
            engine.get('/c'),
        ])

        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(r1.status).toBe(200)
        expect(r2.status).toBe(200)
        expect(r3.status).toBe(200)
    })

    it('刷新失败 → onRefreshFail 被调用，所有等待的请求被拒绝', async () => {
        const fetchMock = setupFetchMock(false)
        globalThis.fetch = fetchMock

        const adapter = createMockAdapter({ alwaysUnauthorized: true })
        const onRefreshFail = vi.fn()

        const engine = createRequest({
            adapter,
            plugins: [
                dualTokenPlugin({
                    getAccessToken: () => accessToken,
                    getRefreshToken: () => refreshToken,
                    refreshURL: '/auth/refresh',
                    onRefreshSuccess: vi.fn(),
                    onRefreshFail,
                }),
            ],
        })

        await expect(engine.get('/users')).rejects.toThrow('Token refresh failed')
        expect(onRefreshFail).toHaveBeenCalledTimes(1)
    })

    it('并发多个 401 且刷新失败 → 所有请求均被拒绝', async () => {
        let callCount = 0
        const adapter: Adapter = {
            request: vi.fn(async (config: RequestConfig): Promise<Response> => {
                callCount++
                return {
                    data: null,
                    status: 401,
                    statusText: 'Unauthorized',
                    headers: {},
                    config,
                }
            }),
        }

        const fetchMock = setupFetchMock(false)
        globalThis.fetch = fetchMock

        const onRefreshFail = vi.fn()

        const engine = createRequest({
            adapter,
            plugins: [
                dualTokenPlugin({
                    getAccessToken: () => accessToken,
                    getRefreshToken: () => refreshToken,
                    refreshURL: '/auth/refresh',
                    onRefreshSuccess: vi.fn(),
                    onRefreshFail,
                }),
            ],
        })

        const results = await Promise.allSettled([
            engine.get('/a'),
            engine.get('/b'),
        ])

        expect(results[0].status).toBe('rejected')
        expect(results[1].status).toBe('rejected')
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('自定义 isUnauthorized 生效', async () => {
        const adapter: Adapter = {
            request: vi.fn(async (config: RequestConfig): Promise<Response> => ({
                data: { code: 10401 },
                status: 200,
                statusText: 'OK',
                headers: {},
                config,
            })),
        }

        const fetchMock = setupFetchMock(false)
        globalThis.fetch = fetchMock

        const onRefreshFail = vi.fn()

        const engine = createRequest({
            adapter,
            plugins: [
                dualTokenPlugin({
                    getAccessToken: () => accessToken,
                    getRefreshToken: () => refreshToken,
                    refreshURL: '/auth/refresh',
                    onRefreshSuccess: vi.fn(),
                    onRefreshFail,
                    isUnauthorized: (res) => res.data?.code === 10401,
                }),
            ],
        })

        await expect(engine.get('/users')).rejects.toThrow('Token refresh failed')
        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(onRefreshFail).toHaveBeenCalled()
    })

    it('自定义 headerKey / prefix 生效', async () => {
        const adapter = createMockAdapter()

        const engine = createRequest({
            adapter,
            plugins: [
                dualTokenPlugin({
                    getAccessToken: () => 'my-token',
                    getRefreshToken: () => refreshToken,
                    refreshURL: '/auth/refresh',
                    onRefreshSuccess: vi.fn(),
                    onRefreshFail: vi.fn(),
                    headerKey: 'X-Access-Token',
                    prefix: 'Token',
                }),
            ],
        })

        await engine.get('/users')

        expect(adapter.request).toHaveBeenCalledWith(
            expect.objectContaining({
                headers: expect.objectContaining({
                    'X-Access-Token': 'Token my-token',
                }),
            })
        )
    })

    it('刷新地址自身的请求不会触发循环刷新', async () => {
        const fetchMock = setupFetchMock(true)
        globalThis.fetch = fetchMock

        let callCount = 0
        const adapter: Adapter = {
            request: vi.fn(async (config: RequestConfig): Promise<Response> => {
                callCount++
                return {
                    data: null,
                    status: 401,
                    statusText: 'Unauthorized',
                    headers: {},
                    config,
                }
            }),
        }

        const engine = createRequest({
            baseURL: 'https://api.example.com',
            adapter,
            plugins: [
                dualTokenPlugin({
                    getAccessToken: () => accessToken,
                    getRefreshToken: () => refreshToken,
                    refreshURL: '/auth/refresh',
                    onRefreshSuccess: vi.fn(),
                    onRefreshFail: vi.fn(),
                }),
            ],
        })

        const res = await engine.post('https://api.example.com/auth/refresh')

        expect(res.status).toBe(401)
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('刷新请求拼接 baseURL', async () => {
        const fetchMock = setupFetchMock(true)
        globalThis.fetch = fetchMock

        const adapter = createMockAdapter({ unauthorizedOnce: true })
        const onRefreshSuccess = vi.fn((tokens) => {
            accessToken = tokens.access
        })

        const engine = createRequest({
            baseURL: 'https://api.example.com',
            adapter,
            plugins: [
                dualTokenPlugin({
                    getAccessToken: () => accessToken,
                    getRefreshToken: () => refreshToken,
                    refreshURL: '/auth/refresh',
                    onRefreshSuccess,
                    onRefreshFail: vi.fn(),
                }),
            ],
        })

        await engine.get('/users')

        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.example.com/auth/refresh',
            expect.any(Object)
        )
    })

    it('access token 为 null 时不注入请求头', async () => {
        const adapter = createMockAdapter()

        const engine = createRequest({
            adapter,
            plugins: [
                dualTokenPlugin({
                    getAccessToken: () => null,
                    getRefreshToken: () => refreshToken,
                    refreshURL: '/auth/refresh',
                    onRefreshSuccess: vi.fn(),
                    onRefreshFail: vi.fn(),
                }),
            ],
        })

        await engine.get('/users')

        const calledConfig = (adapter.request as ReturnType<typeof vi.fn>)
            .mock.calls[0][0] as RequestConfig
        expect(calledConfig.headers?.Authorization).toBeUndefined()
    })

    it('prefix 为空字符串时直接使用 token 作为值', async () => {
        const adapter = createMockAdapter()

        const engine = createRequest({
            adapter,
            plugins: [
                dualTokenPlugin({
                    getAccessToken: () => 'raw-token',
                    getRefreshToken: () => refreshToken,
                    refreshURL: '/auth/refresh',
                    onRefreshSuccess: vi.fn(),
                    onRefreshFail: vi.fn(),
                    prefix: '',
                }),
            ],
        })

        await engine.get('/users')

        expect(adapter.request).toHaveBeenCalledWith(
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'raw-token',
                }),
            })
        )
    })
})
