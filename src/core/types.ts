/** 标准 HTTP 请求方法 */
export type Method =
    | 'GET'
    | 'POST'
    | 'PUT'
    | 'DELETE'
    | 'PATCH'
    | 'HEAD'
    | 'OPTIONS'

/** 单次请求的完整配置，贯穿整个中间件管线 */
export interface RequestConfig {
    /** 请求路径，会与 baseURL 拼接 */
    url: string
    /** HTTP 方法 */
    method: Method
    /** 基础地址前缀，由引擎从 GlobalConfig 注入 */
    baseURL?: string
    /** 请求头 */
    headers?: Record<string, string>
    /** URL 查询参数 */
    params?: Record<string, any>
    /** 请求体 */
    data?: any
    /** 超时时间（毫秒） */
    timeout?: number
    /** 用于手动取消请求的 AbortSignal */
    signal?: AbortSignal
    /** 期望的响应数据格式 */
    responseType?: 'json' | 'text' | 'blob' | 'arraybuffer'
    /** 插件与调用方之间的通信通道，可携带自定义标记供插件读取 */
    meta?: Record<string, any>
    /** 请求级中间件，插入到全局中间件内层、适配器外层执行 */
    middleware?: Middleware[]
}

/** 标准化响应结构，所有适配器返回值都会被转换为此格式 */
export interface Response<T = any> {
    /** 响应数据，类型由泛型 T 决定 */
    data: T
    /** HTTP 状态码 */
    status: number
    /** HTTP 状态文本 */
    statusText: string
    /** 响应头 */
    headers: Record<string, string>
    /** 产生此响应的原始请求配置 */
    config: RequestConfig
}

/** 管线中的下一步处理函数，调用后将请求传递给下游中间件或适配器 */
export type Next = (config: RequestConfig) => Promise<Response>

/** 洋葱模型中间件，可在请求/响应两个阶段进行拦截和修改 */
export type Middleware = (
    config: RequestConfig,
    next: Next
) => Promise<Response>

/** 传输层适配器，负责将 RequestConfig 转为实际的网络请求并返回标准化响应 */
export interface Adapter {
    request(config: RequestConfig): Promise<Response>
}

/** 插件是中间件的高级抽象，可在 setup 阶段注册中间件并访问引擎上下文 */
export interface Plugin {
    /** 插件唯一标识名称 */
    name: string
    /** 引擎初始化时调用，用于注册中间件和读取配置 */
    setup(ctx: PluginContext): void
}

/** 插件初始化时接收的上下文对象，提供中间件注册和配置访问能力 */
export interface PluginContext {
    /** 注册一个中间件到管线中 */
    useMiddleware(middleware: Middleware): void
    /** 获取当前引擎的全局配置（只读快照） */
    getConfig(): GlobalConfig
    /** 插件间共享状态的容器 */
    shared: Map<string, any>
}

/** 传入 createRequest 的全局配置，决定引擎的基础行为 */
export interface GlobalConfig {
    /** 传输层适配器（必选） */
    adapter: Adapter
    /** 所有请求的基础地址前缀 */
    baseURL?: string
    /** 所有请求的默认请求头 */
    headers?: Record<string, string>
    /** 所有请求的默认超时时间（毫秒） */
    timeout?: number
    /** 所有请求的默认响应数据格式 */
    responseType?: 'json' | 'text' | 'blob' | 'arraybuffer'
    /** 插件列表，按数组顺序决定中间件执行顺序（靠前 = 更外层） */
    plugins?: Plugin[]
}

/** createRequest 返回的公开请求客户端接口 */
export interface RequestClient {
    /** 发送通用请求 */
    request<T = any>(requestConfig: RequestConfig): Promise<Response<T>>
    /** 发送 GET 请求 */
    get<T = any>(
        url: string,
        config?: Omit<RequestConfig, 'url' | 'method'>
    ): Promise<Response<T>>
    /** 发送 POST 请求 */
    post<T = any>(
        url: string,
        data?: any,
        config?: Omit<RequestConfig, 'url' | 'method' | 'data'>
    ): Promise<Response<T>>
    /** 发送 PUT 请求 */
    put<T = any>(
        url: string,
        data?: any,
        config?: Omit<RequestConfig, 'url' | 'method' | 'data'>
    ): Promise<Response<T>>
    /** 发送 DELETE 请求 */
    delete<T = any>(
        url: string,
        config?: Omit<RequestConfig, 'url' | 'method'>
    ): Promise<Response<T>>
    /** 发送 PATCH 请求 */
    patch<T = any>(
        url: string,
        data?: any,
        config?: Omit<RequestConfig, 'url' | 'method' | 'data'>
    ): Promise<Response<T>>
    /** 发送 HEAD 请求 */
    head<T = any>(
        url: string,
        config?: Omit<RequestConfig, 'url' | 'method'>
    ): Promise<Response<T>>
    /** 发送 OPTIONS 请求 */
    options<T = any>(
        url: string,
        config?: Omit<RequestConfig, 'url' | 'method'>
    ): Promise<Response<T>>
}
