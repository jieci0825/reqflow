import type { Method } from '@/core/types'

/** 标准 SSE 事件 */
export interface SSEEvent {
    /** 事件类型，默认 'message' */
    event: string
    /** 事件数据 */
    data: string
    /** 事件 ID */
    id?: string
    /** 重连间隔（毫秒） */
    retry?: number
}

/** SSE 配置项 */
export interface SSEOptions {
    /** HTTP 方法，默认 GET */
    method?: Method
    /** 额外请求头 */
    headers?: Record<string, string>
    /** 请求体 */
    data?: any
    /** 数据格式：标准 SSE 协议 或 NDJSON */
    format?: 'event-stream' | 'json'
    /** 插件通信通道 */
    meta?: Record<string, any>
}

/** SSE 连接对象 */
export interface SSEConnection<T = any> {
    on(event: 'message', handler: (data: T) => void): this
    on(event: 'error', handler: (error: Error) => void): this
    on(event: 'open', handler: () => void): this
    on(event: 'close', handler: () => void): this
    close(): void
}

/** SSE 解析器的事件回调 */
export interface SSEParserCallbacks {
    onEvent: (event: SSEEvent) => void
    onError: (error: Error) => void
}

/** JSON 流解析器的事件回调 */
export interface JSONStreamParserCallbacks<T = any> {
    onJSON: (data: T) => void
    onError: (error: Error) => void
}
