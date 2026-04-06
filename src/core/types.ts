export type Method =
    | 'GET'
    | 'POST'
    | 'PUT'
    | 'DELETE'
    | 'PATCH'
    | 'HEAD'
    | 'OPTIONS'

export interface RequestConfig {
    url: string
    method: Method
    baseURL?: string
    headers?: Record<string, string>
    params?: Record<string, any>
    data?: any
    timeout?: number
    signal?: AbortSignal
    responseType?: 'json' | 'text' | 'blob' | 'arraybuffer'
    meta?: Record<string, any>
    middleware?: Middleware[]
}

export interface Response<T = any> {
    data: T
    status: number
    statusText: string
    headers: Record<string, string>
    config: RequestConfig
}

export type Next = (config: RequestConfig) => Promise<Response>

export type Middleware = (
    config: RequestConfig,
    next: Next
) => Promise<Response>

export interface Adapter {
    request(config: RequestConfig): Promise<Response>
}

export interface Plugin {
    name: string
    setup(ctx: PluginContext): void
}

export interface PluginContext {
    useMiddleware(middleware: Middleware): void
    getConfig(): GlobalConfig
    shared: Map<string, any>
}

export interface GlobalConfig {
    adapter: Adapter
    baseURL?: string
    headers?: Record<string, string>
    timeout?: number
    responseType?: 'json' | 'text' | 'blob' | 'arraybuffer'
    plugins?: Plugin[]
}
