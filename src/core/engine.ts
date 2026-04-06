import { compose } from './pipeline'

import type {
    Adapter,
    GlobalConfig,
    Middleware,
    PluginContext,
    RequestConfig,
    Response,
} from './types'

/** 判断 URL 是否为绝对 URL */
function isAbsoluteURL(url: string): boolean {
    return /^https?:\/\//i.test(url)
}

/** 拼接 baseURL 与相对路径，处理首尾斜杠 */
function joinURL(baseURL: string, relativeURL: string): string {
    return baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
}

/** 请求引擎类，负责管理全局配置、中间件、适配器和插件 */
class RequestEngine {
    private adapter: Adapter
    private middlewares: Middleware[] = []
    private shared: Map<string, any> = new Map()
    private globalConfig: GlobalConfig

    constructor(config: GlobalConfig) {
        this.globalConfig = config
        this.adapter = config.adapter

        const ctx: PluginContext = {
            useMiddleware: (middleware: Middleware) => {
                this.middlewares.push(middleware)
            },
            getConfig: () => ({ ...this.globalConfig }),
            shared: this.shared,
        }

        if (config.plugins) {
            for (const plugin of config.plugins) {
                plugin.setup(ctx)
            }
        }
    }

    /** 发送请求，将配置经过中间件管线后交由适配器执行 */
    async request<T = any>(requestConfig: RequestConfig): Promise<Response<T>> {
        const mergedConfig = this.mergeConfig(requestConfig)
        const { middleware: requestMiddleware, ...config } = mergedConfig

        const middlewares = requestMiddleware
            ? [...this.middlewares, ...requestMiddleware]
            : this.middlewares

        const dispatch = compose(middlewares, this.adapter)
        return dispatch(config) as Promise<Response<T>>
    }

    /** 发送 GET 请求 */
    get<T = any>(
        url: string,
        config?: Omit<RequestConfig, 'url' | 'method'>
    ): Promise<Response<T>> {
        return this.request<T>({ ...config, url, method: 'GET' })
    }

    /** 发送 POST 请求 */
    post<T = any>(
        url: string,
        data?: any,
        config?: Omit<RequestConfig, 'url' | 'method' | 'data'>
    ): Promise<Response<T>> {
        return this.request<T>({ ...config, url, method: 'POST', data })
    }

    /** 发送 PUT 请求 */
    put<T = any>(
        url: string,
        data?: any,
        config?: Omit<RequestConfig, 'url' | 'method' | 'data'>
    ): Promise<Response<T>> {
        return this.request<T>({ ...config, url, method: 'PUT', data })
    }

    /** 发送 DELETE 请求 */
    delete<T = any>(
        url: string,
        config?: Omit<RequestConfig, 'url' | 'method'>
    ): Promise<Response<T>> {
        return this.request<T>({ ...config, url, method: 'DELETE' })
    }

    /** 发送 PATCH 请求 */
    patch<T = any>(
        url: string,
        data?: any,
        config?: Omit<RequestConfig, 'url' | 'method' | 'data'>
    ): Promise<Response<T>> {
        return this.request<T>({ ...config, url, method: 'PATCH', data })
    }

    /** 发送 HEAD 请求 */
    head<T = any>(
        url: string,
        config?: Omit<RequestConfig, 'url' | 'method'>
    ): Promise<Response<T>> {
        return this.request<T>({ ...config, url, method: 'HEAD' })
    }

    /** 发送 OPTIONS 请求 */
    options<T = any>(
        url: string,
        config?: Omit<RequestConfig, 'url' | 'method'>
    ): Promise<Response<T>> {
        return this.request<T>({ ...config, url, method: 'OPTIONS' })
    }

    /** 将全局配置与请求级配置合并，请求级优先 */
    private mergeConfig(requestConfig: RequestConfig): RequestConfig {
        const {
            baseURL,
            headers: globalHeaders,
            timeout,
            responseType,
        } = this.globalConfig

        const merged: RequestConfig = { ...requestConfig }

        if (baseURL && !isAbsoluteURL(merged.url)) {
            merged.url = joinURL(baseURL, merged.url)
        }

        if (globalHeaders) {
            merged.headers = { ...globalHeaders, ...merged.headers }
        }

        if (merged.timeout === undefined && timeout !== undefined) {
            merged.timeout = timeout
        }

        if (merged.responseType === undefined && responseType !== undefined) {
            merged.responseType = responseType
        }

        return merged
    }
}

/** 创建请求引擎实例，接收全局配置并初始化插件系统 */
export function createRequest(config: GlobalConfig): RequestEngine {
    return new RequestEngine(config)
}
