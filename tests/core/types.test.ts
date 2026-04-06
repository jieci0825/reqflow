import { expectTypeOf, describe, it } from 'vitest'

import type {
    Adapter,
    GlobalConfig,
    Method,
    Middleware,
    Next,
    Plugin,
    PluginContext,
    RequestConfig,
    Response,
} from '@/core/types'

describe('核心类型定义', () => {
    it('Method 只允许标准 HTTP 方法', () => {
        expectTypeOf<Method>().toEqualTypeOf<
            'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
        >()
    })

    it('RequestConfig 必须包含 url 和 method', () => {
        expectTypeOf<RequestConfig>().toHaveProperty('url')
        expectTypeOf<RequestConfig>().toHaveProperty('method')
        expectTypeOf<RequestConfig['url']>().toBeString()
        expectTypeOf<RequestConfig['method']>().toEqualTypeOf<Method>()
    })

    it('RequestConfig 可选字段类型正确', () => {
        expectTypeOf<RequestConfig['baseURL']>().toEqualTypeOf<
            string | undefined
        >()
        expectTypeOf<RequestConfig['headers']>().toEqualTypeOf<
            Record<string, string> | undefined
        >()
        expectTypeOf<RequestConfig['timeout']>().toEqualTypeOf<
            number | undefined
        >()
        expectTypeOf<RequestConfig['signal']>().toEqualTypeOf<
            AbortSignal | undefined
        >()
        expectTypeOf<RequestConfig['middleware']>().toEqualTypeOf<
            Middleware[] | undefined
        >()
    })

    it('Response 支持泛型推导', () => {
        expectTypeOf<Response<string>>().toHaveProperty('data')
        expectTypeOf<Response<string>['data']>().toBeString()
        expectTypeOf<Response<number>['data']>().toBeNumber()
        expectTypeOf<Response['data']>().toBeAny()
    })

    it('Response 包含标准化字段', () => {
        expectTypeOf<Response>().toHaveProperty('status')
        expectTypeOf<Response>().toHaveProperty('statusText')
        expectTypeOf<Response>().toHaveProperty('headers')
        expectTypeOf<Response>().toHaveProperty('config')
        expectTypeOf<Response['status']>().toBeNumber()
        expectTypeOf<Response['statusText']>().toBeString()
        expectTypeOf<Response['config']>().toEqualTypeOf<RequestConfig>()
    })

    it('Next 接收 RequestConfig 返回 Promise<Response>', () => {
        expectTypeOf<Next>().toBeFunction()
        expectTypeOf<Next>().parameter(0).toEqualTypeOf<RequestConfig>()
        expectTypeOf<Next>().returns.toEqualTypeOf<Promise<Response>>()
    })

    it('Middleware 接收 config 和 next，返回 Promise<Response>', () => {
        expectTypeOf<Middleware>().toBeFunction()
        expectTypeOf<Middleware>().parameter(0).toEqualTypeOf<RequestConfig>()
        expectTypeOf<Middleware>().parameter(1).toEqualTypeOf<Next>()
        expectTypeOf<Middleware>().returns.toEqualTypeOf<Promise<Response>>()
    })

    it('Adapter 具有 request 方法', () => {
        expectTypeOf<Adapter>().toHaveProperty('request')
        expectTypeOf<Adapter['request']>()
            .parameter(0)
            .toEqualTypeOf<RequestConfig>()
        expectTypeOf<Adapter['request']>().returns.toEqualTypeOf<
            Promise<Response>
        >()
    })

    it('Plugin 具有 name 和 setup', () => {
        expectTypeOf<Plugin>().toHaveProperty('name')
        expectTypeOf<Plugin>().toHaveProperty('setup')
        expectTypeOf<Plugin['name']>().toBeString()
    })

    it('PluginContext 提供 useMiddleware、getConfig 和 shared', () => {
        expectTypeOf<PluginContext>().toHaveProperty('useMiddleware')
        expectTypeOf<PluginContext>().toHaveProperty('getConfig')
        expectTypeOf<PluginContext>().toHaveProperty('shared')
        expectTypeOf<PluginContext['shared']>().toEqualTypeOf<
            Map<string, any>
        >()
        expectTypeOf<
            PluginContext['getConfig']
        >().returns.toEqualTypeOf<GlobalConfig>()
    })

    it('GlobalConfig 必须包含 adapter', () => {
        expectTypeOf<GlobalConfig>().toHaveProperty('adapter')
        expectTypeOf<GlobalConfig['adapter']>().toEqualTypeOf<Adapter>()
    })

    it('GlobalConfig 可选字段类型正确', () => {
        expectTypeOf<GlobalConfig['baseURL']>().toEqualTypeOf<
            string | undefined
        >()
        expectTypeOf<GlobalConfig['headers']>().toEqualTypeOf<
            Record<string, string> | undefined
        >()
        expectTypeOf<GlobalConfig['timeout']>().toEqualTypeOf<
            number | undefined
        >()
        expectTypeOf<GlobalConfig['plugins']>().toEqualTypeOf<
            Plugin[] | undefined
        >()
    })
})
