import { describe, it, expect, vi } from 'vitest'

import { createRequest } from '@/core/engine'

import type {
    Adapter,
    GlobalConfig,
    Middleware,
    Plugin,
    RequestConfig,
    Response,
} from '@/core/types'

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

describe('createRequest', () => {
    it('createRequest({ adapter }) 不报错', () => {
        const adapter = createMockAdapter()
        expect(() => createRequest({ adapter })).not.toThrow()
    })

    it('.request() 端到端工作', async () => {
        const adapter = createMockAdapter({ data: { users: [] } })
        const engine = createRequest({ adapter })

        const res = await engine.request({ url: '/users', method: 'GET' })

        expect(res.data).toEqual({ users: [] })
        expect(res.status).toBe(200)
        expect(adapter.request).toHaveBeenCalledOnce()
    })

    it('返回的响应保留泛型类型', async () => {
        interface User {
            id: number
            name: string
        }

        const adapter = createMockAdapter({
            data: [{ id: 1, name: 'Alice' }],
        })
        const engine = createRequest({ adapter })

        const res = await engine.request<User[]>({
            url: '/users',
            method: 'GET',
        })

        expect(res.data).toEqual([{ id: 1, name: 'Alice' }])
    })
})

describe('baseURL 拼接', () => {
    it('相对路径与 baseURL 拼接', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({
            adapter,
            baseURL: 'https://api.example.com',
        })

        await engine.request({ url: '/users', method: 'GET' })

        expect(adapter.request).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'https://api.example.com/users',
            })
        )
    })

    it('绝对路径不拼接 baseURL', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({
            adapter,
            baseURL: 'https://api.example.com',
        })

        await engine.request({
            url: 'https://other.com/data',
            method: 'GET',
        })

        expect(adapter.request).toHaveBeenCalledWith(
            expect.objectContaining({ url: 'https://other.com/data' })
        )
    })

    it('baseURL 尾部斜杠与 url 前导斜杠正确处理', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({
            adapter,
            baseURL: 'https://api.example.com/',
        })

        await engine.request({ url: '/users', method: 'GET' })

        expect(adapter.request).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'https://api.example.com/users',
            })
        )
    })

    it('url 无前导斜杠时也能正确拼接', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({
            adapter,
            baseURL: 'https://api.example.com',
        })

        await engine.request({ url: 'users', method: 'GET' })

        expect(adapter.request).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'https://api.example.com/users',
            })
        )
    })

    it('未配置 baseURL 时 url 保持原样', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({ adapter })

        await engine.request({ url: '/users', method: 'GET' })

        expect(adapter.request).toHaveBeenCalledWith(
            expect.objectContaining({ url: '/users' })
        )
    })
})

describe('全局配置合并', () => {
    it('全局 headers 与请求级 headers 合并，请求级优先', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({
            adapter,
            headers: { 'X-Global': 'yes', 'Content-Type': 'text/plain' },
        })

        await engine.request({
            url: '/test',
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        })

        expect(adapter.request).toHaveBeenCalledWith(
            expect.objectContaining({
                headers: {
                    'X-Global': 'yes',
                    'Content-Type': 'application/json',
                },
            })
        )
    })

    it('仅有全局 headers 时正确注入', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({
            adapter,
            headers: { 'X-Global': 'yes' },
        })

        await engine.request({ url: '/test', method: 'GET' })

        expect(adapter.request).toHaveBeenCalledWith(
            expect.objectContaining({
                headers: { 'X-Global': 'yes' },
            })
        )
    })

    it('全局 timeout 作为默认值', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({ adapter, timeout: 5000 })

        await engine.request({ url: '/test', method: 'GET' })

        expect(adapter.request).toHaveBeenCalledWith(
            expect.objectContaining({ timeout: 5000 })
        )
    })

    it('请求级 timeout 覆盖全局 timeout', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({ adapter, timeout: 5000 })

        await engine.request({ url: '/test', method: 'GET', timeout: 1000 })

        expect(adapter.request).toHaveBeenCalledWith(
            expect.objectContaining({ timeout: 1000 })
        )
    })

    it('全局 responseType 作为默认值', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({ adapter, responseType: 'text' })

        await engine.request({ url: '/test', method: 'GET' })

        expect(adapter.request).toHaveBeenCalledWith(
            expect.objectContaining({ responseType: 'text' })
        )
    })

    it('请求级 responseType 覆盖全局 responseType', async () => {
        const adapter = createMockAdapter()
        const engine = createRequest({ adapter, responseType: 'text' })

        await engine.request({
            url: '/test',
            method: 'GET',
            responseType: 'json',
        })

        expect(adapter.request).toHaveBeenCalledWith(
            expect.objectContaining({ responseType: 'json' })
        )
    })
})

describe('插件系统', () => {
    it('插件的 setup() 被调用', () => {
        const adapter = createMockAdapter()
        const setupFn = vi.fn()
        const plugin: Plugin = { name: 'test-plugin', setup: setupFn }

        createRequest({ adapter, plugins: [plugin] })

        expect(setupFn).toHaveBeenCalledOnce()
        expect(setupFn).toHaveBeenCalledWith(
            expect.objectContaining({
                useMiddleware: expect.any(Function),
                getConfig: expect.any(Function),
                shared: expect.any(Map),
            })
        )
    })

    it('多个插件的 setup() 按数组顺序依次调用', () => {
        const order: string[] = []
        const adapter = createMockAdapter()

        const pluginA: Plugin = {
            name: 'plugin-a',
            setup: () => order.push('A'),
        }
        const pluginB: Plugin = {
            name: 'plugin-b',
            setup: () => order.push('B'),
        }

        createRequest({ adapter, plugins: [pluginA, pluginB] })

        expect(order).toEqual(['A', 'B'])
    })

    it('插件通过 useMiddleware 注册的中间件会被执行', async () => {
        const adapter = createMockAdapter()
        const middlewareFn = vi.fn<Middleware>(async (config, next) =>
            next(config)
        )

        const plugin: Plugin = {
            name: 'test-plugin',
            setup(ctx) {
                ctx.useMiddleware(middlewareFn)
            },
        }

        const engine = createRequest({ adapter, plugins: [plugin] })
        await engine.request({ url: '/test', method: 'GET' })

        expect(middlewareFn).toHaveBeenCalledOnce()
    })

    it('多个插件的中间件按注册顺序形成洋葱模型', async () => {
        const order: string[] = []
        const adapter = createMockAdapter()

        const pluginA: Plugin = {
            name: 'plugin-a',
            setup(ctx) {
                ctx.useMiddleware(async (config, next) => {
                    order.push('A-before')
                    const res = await next(config)
                    order.push('A-after')
                    return res
                })
            },
        }

        const pluginB: Plugin = {
            name: 'plugin-b',
            setup(ctx) {
                ctx.useMiddleware(async (config, next) => {
                    order.push('B-before')
                    const res = await next(config)
                    order.push('B-after')
                    return res
                })
            },
        }

        const engine = createRequest({
            adapter,
            plugins: [pluginA, pluginB],
        })
        await engine.request({ url: '/test', method: 'GET' })

        expect(order).toEqual(['A-before', 'B-before', 'B-after', 'A-after'])
    })

    it('getConfig() 返回全局配置快照', () => {
        const adapter = createMockAdapter()
        let capturedConfig: GlobalConfig | undefined

        const plugin: Plugin = {
            name: 'config-reader',
            setup(ctx) {
                capturedConfig = ctx.getConfig()
            },
        }

        createRequest({
            adapter,
            baseURL: 'https://api.example.com',
            plugins: [plugin],
        })

        expect(capturedConfig).toBeDefined()
        expect(capturedConfig!.baseURL).toBe('https://api.example.com')
        expect(capturedConfig!.adapter).toBe(adapter)
    })

    it('getConfig() 返回的是快照，修改不影响引擎', async () => {
        const adapter = createMockAdapter()

        const plugin: Plugin = {
            name: 'mutator',
            setup(ctx) {
                const cfg = ctx.getConfig()
                cfg.baseURL = 'https://mutated.com'
            },
        }

        const engine = createRequest({
            adapter,
            baseURL: 'https://api.example.com',
            plugins: [plugin],
        })

        await engine.request({ url: '/test', method: 'GET' })

        expect(adapter.request).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'https://api.example.com/test',
            })
        )
    })

    it('shared 在插件间共享状态', () => {
        const adapter = createMockAdapter()

        const pluginWriter: Plugin = {
            name: 'writer',
            setup(ctx) {
                ctx.shared.set('key', 'value')
            },
        }

        let readValue: any
        const pluginReader: Plugin = {
            name: 'reader',
            setup(ctx) {
                readValue = ctx.shared.get('key')
            },
        }

        createRequest({
            adapter,
            plugins: [pluginWriter, pluginReader],
        })

        expect(readValue).toBe('value')
    })

    it('无插件时正常工作', async () => {
        const adapter = createMockAdapter({ data: 'ok' })
        const engine = createRequest({ adapter })

        const res = await engine.request({ url: '/test', method: 'GET' })

        expect(res.data).toBe('ok')
    })

    it('插件注册的中间件可以修改请求配置', async () => {
        const adapter = createMockAdapter()

        const plugin: Plugin = {
            name: 'header-injector',
            setup(ctx) {
                ctx.useMiddleware(async (config, next) => {
                    return next({
                        ...config,
                        headers: {
                            ...config.headers,
                            'X-Injected': 'by-plugin',
                        },
                    })
                })
            },
        }

        const engine = createRequest({ adapter, plugins: [plugin] })
        await engine.request({ url: '/test', method: 'GET' })

        expect(adapter.request).toHaveBeenCalledWith(
            expect.objectContaining({
                headers: { 'X-Injected': 'by-plugin' },
            })
        )
    })
})
