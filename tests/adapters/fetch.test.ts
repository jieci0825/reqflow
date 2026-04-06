import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { fetchAdapter } from '@/adapters/fetch'

import type { RequestConfig } from '@/core/types'

function createConfig(overrides?: Partial<RequestConfig>): RequestConfig {
    return { url: 'https://api.example.com/test', method: 'GET', ...overrides }
}

/** 创建模拟 fetch 响应，自动处理 signal abort */
function mockFetchResolve(body: any, init?: ResponseInit) {
    return (_url: string, reqInit?: RequestInit) => {
        return new Promise<globalThis.Response>((resolve, reject) => {
            const response = new Response(
                typeof body === 'string' ? body : JSON.stringify(body),
                init
            )

            // 如果请求被中止，则拒绝请求，保持行为和浏览器一致
            if (reqInit?.signal?.aborted) {
                reject(
                    new DOMException('The operation was aborted.', 'AbortError')
                )
                return
            }

            // 如果在外面监听到了请求被中止，则拒绝请求，保持行为和浏览器一致
            reqInit?.signal?.addEventListener('abort', () => {
                reject(
                    new DOMException('The operation was aborted.', 'AbortError')
                )
            })

            resolve(response)
        })
    }
}

/** 创建永不 resolve 的 fetch 模拟，仅在 abort 时 reject */
function mockFetchHang() {
    return (_url: string, init?: RequestInit) => {
        return new Promise<globalThis.Response>((_, reject) => {
            if (init?.signal?.aborted) {
                reject(
                    new DOMException('The operation was aborted.', 'AbortError')
                )
                return
            }

            init?.signal?.addEventListener('abort', () => {
                reject(
                    new DOMException('The operation was aborted.', 'AbortError')
                )
            })
        })
    }
}

describe('fetchAdapter', () => {
    let fetchSpy: ReturnType<typeof vi.fn>

    beforeEach(() => {
        // 创建一个模拟的 fetch 假函数
        fetchSpy = vi.fn()
        // 将全局名为 fetch 的函数替换为我们的模拟函数
        vi.stubGlobal('fetch', fetchSpy)
    })

    afterEach(() => {
        // 恢复所有全局变量的原始值
        vi.unstubAllGlobals()
    })

    describe('HTTP 方法', () => {
        // 测试每个 HTTP 方法是否正确发出请求
        it.each([
            'GET',
            'POST',
            'PUT',
            'DELETE',
            'PATCH',
            'HEAD',
            'OPTIONS',
        ] as const)('正确发出 %s 请求', async method => {
            // 给 fetchSpy 一个假实现，调用fetch 时候，返回一个成功状态码为 200 的响应
            fetchSpy.mockImplementation(mockFetchResolve({}, { status: 200 }))

            // 创建一个 fetchAdapter 实例
            const adapter = fetchAdapter()
            // 调用 adapter.request 方法，传入一个配置对象，配置对象中包含 method 方法
            await adapter.request(createConfig({ method }))

            // 断言 fetchSpy 被调用时，传入的参数是否正确
            expect(fetchSpy).toHaveBeenCalledWith(
                expect.any(String), // 断言传入的第一个参数是一个字符串
                expect.objectContaining({ method }) // 断言传入的第二个参数是一个对象，对象中包含 method 方法
            )
        })
    })

    describe('请求参数传递', () => {
        it('headers 正确传递', async () => {
            fetchSpy.mockImplementation(mockFetchResolve({}, { status: 200 }))

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer token',
            }
            const adapter = fetchAdapter()
            await adapter.request(createConfig({ headers }))

            expect(fetchSpy).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ headers })
            )
        })

        it('params 正确拼接到 URL', async () => {
            fetchSpy.mockImplementation(mockFetchResolve({}, { status: 200 }))

            const adapter = fetchAdapter()
            await adapter.request(
                createConfig({ params: { page: 1, size: 10 } })
            )

            expect(fetchSpy).toHaveBeenCalledWith(
                'https://api.example.com/test?page=1&size=10',
                expect.any(Object)
            )
        })

        it('已有查询参数的 URL 正确追加 params', async () => {
            fetchSpy.mockImplementation(mockFetchResolve({}, { status: 200 }))

            const adapter = fetchAdapter()
            await adapter.request(
                createConfig({
                    url: 'https://api.example.com/test?existing=1',
                    params: { extra: 'yes' },
                })
            )

            expect(fetchSpy).toHaveBeenCalledWith(
                'https://api.example.com/test?existing=1&extra=yes',
                expect.any(Object)
            )
        })

        it('params 中的 null/undefined 值被忽略', async () => {
            fetchSpy.mockImplementation(mockFetchResolve({}, { status: 200 }))

            const adapter = fetchAdapter()
            await adapter.request(
                createConfig({
                    params: { key: 'value', empty: null, missing: undefined },
                })
            )

            expect(fetchSpy).toHaveBeenCalledWith(
                'https://api.example.com/test?key=value',
                expect.any(Object)
            )
        })

        it('无有效 params 时 URL 保持不变', async () => {
            fetchSpy.mockImplementation(mockFetchResolve({}, { status: 200 }))

            const adapter = fetchAdapter()
            await adapter.request(
                createConfig({ params: { a: null, b: undefined } })
            )

            expect(fetchSpy).toHaveBeenCalledWith(
                'https://api.example.com/test',
                expect.any(Object)
            )
        })

        it('对象 data 被 JSON 序列化为请求体', async () => {
            fetchSpy.mockImplementation(mockFetchResolve({}, { status: 200 }))

            const data = { id: 1, name: 'foo' }
            const adapter = fetchAdapter()
            await adapter.request(createConfig({ method: 'POST', data }))

            expect(fetchSpy).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ body: JSON.stringify(data) })
            )
        })

        it('字符串 data 直接作为请求体发送', async () => {
            fetchSpy.mockImplementation(mockFetchResolve({}, { status: 200 }))

            const adapter = fetchAdapter()
            await adapter.request(
                createConfig({ method: 'POST', data: 'raw-text' })
            )

            expect(fetchSpy).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ body: 'raw-text' })
            )
        })

        it('GET 请求即使传入 data 也不携带 body', async () => {
            fetchSpy.mockImplementation(mockFetchResolve({}, { status: 200 }))

            const adapter = fetchAdapter()
            await adapter.request(
                createConfig({ method: 'GET', data: { key: 'value' } })
            )

            const callArgs = fetchSpy.mock.calls[0][1] as RequestInit
            expect(callArgs.body).toBeUndefined()
        })

        it('HEAD 请求即使传入 data 也不携带 body', async () => {
            fetchSpy.mockImplementation(mockFetchResolve({}, { status: 200 }))

            const adapter = fetchAdapter()
            await adapter.request(
                createConfig({ method: 'HEAD', data: { key: 'value' } })
            )

            const callArgs = fetchSpy.mock.calls[0][1] as RequestInit
            expect(callArgs.body).toBeUndefined()
        })
    })

    describe('响应标准化', () => {
        it('响应被标准化为 Response 格式', async () => {
            fetchSpy.mockImplementation(
                mockFetchResolve(
                    { users: [] },
                    { status: 200, statusText: 'OK' }
                )
            )

            const adapter = fetchAdapter()
            const config = createConfig()
            const res = await adapter.request(config)

            expect(res).toMatchObject({
                data: { users: [] },
                status: 200,
                statusText: 'OK',
                config,
            })
            expect(res.headers).toBeDefined()
            expect(typeof res.headers).toBe('object')
        })

        it('响应头被解析为普通键值对', async () => {
            fetchSpy.mockImplementation(
                mockFetchResolve(
                    {},
                    {
                        status: 200,
                        headers: {
                            'content-type': 'application/json',
                            'x-request-id': 'abc-123',
                        },
                    }
                )
            )

            const adapter = fetchAdapter()
            const res = await adapter.request(createConfig())

            expect(res.headers['content-type']).toBe('application/json')
            expect(res.headers['x-request-id']).toBe('abc-123')
        })

        it('默认以 JSON 格式解析响应体', async () => {
            fetchSpy.mockImplementation(
                mockFetchResolve({ key: 'value' }, { status: 200 })
            )

            const adapter = fetchAdapter()
            const res = await adapter.request(createConfig())

            expect(res.data).toEqual({ key: 'value' })
        })

        it('responseType 为 text 时返回文本', async () => {
            fetchSpy.mockImplementation(
                mockFetchResolve('plain text', { status: 200 })
            )

            const adapter = fetchAdapter()
            const res = await adapter.request(
                createConfig({ responseType: 'text' })
            )

            expect(res.data).toBe('plain text')
        })

        it('非 JSON 响应体在默认模式下回退为文本', async () => {
            fetchSpy.mockImplementation(
                mockFetchResolve('not-json', { status: 200 })
            )

            const adapter = fetchAdapter()
            const res = await adapter.request(createConfig())

            expect(res.data).toBe('not-json')
        })

        it('空响应体在默认模式下返回 null', async () => {
            fetchSpy.mockImplementation(() =>
                Promise.resolve(new Response(null, { status: 204 }))
            )

            const adapter = fetchAdapter()
            const res = await adapter.request(createConfig())

            expect(res.data).toBeNull()
        })

        it('原始请求配置被附加到响应中', async () => {
            fetchSpy.mockImplementation(mockFetchResolve({}, { status: 200 }))

            const adapter = fetchAdapter()
            const config = createConfig({
                headers: { 'X-Test': '1' },
                params: { q: 'search' },
            })
            const res = await adapter.request(config)

            expect(res.config).toBe(config)
        })
    })

    describe('timeout / abort', () => {
        it('超时后请求被中止', async () => {
            fetchSpy.mockImplementation(mockFetchHang())

            const adapter = fetchAdapter()

            await expect(
                adapter.request(createConfig({ timeout: 10 }))
            ).rejects.toThrow()
        })

        it('外部 AbortSignal 可取消请求', async () => {
            fetchSpy.mockImplementation(mockFetchHang())

            const externalController = new AbortController()
            const adapter = fetchAdapter()
            const promise = adapter.request(
                createConfig({ signal: externalController.signal })
            )

            externalController.abort()

            await expect(promise).rejects.toThrow()
        })

        it('已中止的 AbortSignal 立即中止请求', async () => {
            fetchSpy.mockImplementation(mockFetchHang())

            const externalController = new AbortController()
            externalController.abort()

            const adapter = fetchAdapter()

            await expect(
                adapter.request(
                    createConfig({ signal: externalController.signal })
                )
            ).rejects.toThrow()
        })

        it('请求正常完成后清除超时定时器', async () => {
            const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
            fetchSpy.mockImplementation(mockFetchResolve({}, { status: 200 }))

            const adapter = fetchAdapter()
            await adapter.request(createConfig({ timeout: 5000 }))

            expect(clearTimeoutSpy).toHaveBeenCalled()
            clearTimeoutSpy.mockRestore()
        })

        it('timeout 和外部 signal 可同时使用', async () => {
            fetchSpy.mockImplementation(mockFetchHang())

            const externalController = new AbortController()
            const adapter = fetchAdapter()
            const promise = adapter.request(
                createConfig({
                    timeout: 5000,
                    signal: externalController.signal,
                })
            )

            externalController.abort()

            await expect(promise).rejects.toThrow()
        })
    })
})
