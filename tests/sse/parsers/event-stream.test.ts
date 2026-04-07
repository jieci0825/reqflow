import { describe, expect, it, vi } from 'vitest'

import { parseEventStream } from '@/sse/parsers/event-stream'

import type { SSEEvent, SSEParserCallbacks } from '@/sse/types'

function createStream(chunks: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder()
    let index = 0
    return new ReadableStream<Uint8Array>({
        pull(controller) {
            if (index < chunks.length) {
                controller.enqueue(encoder.encode(chunks[index]))
                index++
            } else {
                controller.close()
            }
        },
    })
}

function createCallbacks(): SSEParserCallbacks & { events: SSEEvent[], errors: Error[] } {
    const events: SSEEvent[] = []
    const errors: Error[] = []
    return {
        events,
        errors,
        onEvent: vi.fn((event: SSEEvent) => events.push(event)),
        onError: vi.fn((error: Error) => errors.push(error)),
    }
}

describe('parseEventStream', () => {
    it('标准单行 data: hello → 回调 { event: "message", data: "hello" }', async () => {
        const stream = createStream(['data: hello\n\n'])
        const cb = createCallbacks()

        await parseEventStream(stream, cb)

        expect(cb.onEvent).toHaveBeenCalledOnce()
        expect(cb.events[0]).toEqual({ event: 'message', data: 'hello' })
    })

    it('多行 data 拼接', async () => {
        const stream = createStream(['data: line1\ndata: line2\ndata: line3\n\n'])
        const cb = createCallbacks()

        await parseEventStream(stream, cb)

        expect(cb.onEvent).toHaveBeenCalledOnce()
        expect(cb.events[0]).toEqual({ event: 'message', data: 'line1\nline2\nline3' })
    })

    it('自定义 event 类型', async () => {
        const stream = createStream(['event: custom\ndata: payload\n\n'])
        const cb = createCallbacks()

        await parseEventStream(stream, cb)

        expect(cb.events[0]).toEqual({ event: 'custom', data: 'payload' })
    })

    it('注释行（: 开头）被忽略', async () => {
        const stream = createStream([': this is a comment\ndata: visible\n\n'])
        const cb = createCallbacks()

        await parseEventStream(stream, cb)

        expect(cb.onEvent).toHaveBeenCalledOnce()
        expect(cb.events[0]).toEqual({ event: 'message', data: 'visible' })
    })

    it('retry: 字段正确解析', async () => {
        const stream = createStream(['data: hello\nretry: 3000\n\n'])
        const cb = createCallbacks()

        await parseEventStream(stream, cb)

        expect(cb.events[0]).toEqual({ event: 'message', data: 'hello', retry: 3000 })
    })

    it('id: 字段正确解析', async () => {
        const stream = createStream(['data: hello\nid: 42\n\n'])
        const cb = createCallbacks()

        await parseEventStream(stream, cb)

        expect(cb.events[0]).toEqual({ event: 'message', data: 'hello', id: '42' })
    })

    it('多个事件块依次解析', async () => {
        const stream = createStream(['data: first\n\ndata: second\n\n'])
        const cb = createCallbacks()

        await parseEventStream(stream, cb)

        expect(cb.onEvent).toHaveBeenCalledTimes(2)
        expect(cb.events[0]).toEqual({ event: 'message', data: 'first' })
        expect(cb.events[1]).toEqual({ event: 'message', data: 'second' })
    })

    it('跨 chunk 边界正确拼接', async () => {
        const stream = createStream(['data: hel', 'lo\n\n'])
        const cb = createCallbacks()

        await parseEventStream(stream, cb)

        expect(cb.onEvent).toHaveBeenCalledOnce()
        expect(cb.events[0]).toEqual({ event: 'message', data: 'hello' })
    })

    it('data 值中冒号后无空格也能正确解析', async () => {
        const stream = createStream(['data:no-space\n\n'])
        const cb = createCallbacks()

        await parseEventStream(stream, cb)

        expect(cb.events[0]).toEqual({ event: 'message', data: 'no-space' })
    })

    it('data 值中包含冒号', async () => {
        const stream = createStream(['data: key: value\n\n'])
        const cb = createCallbacks()

        await parseEventStream(stream, cb)

        expect(cb.events[0]).toEqual({ event: 'message', data: 'key: value' })
    })

    it('retry 值为非数字时被忽略', async () => {
        const stream = createStream(['data: hello\nretry: abc\n\n'])
        const cb = createCallbacks()

        await parseEventStream(stream, cb)

        expect(cb.events[0]).toEqual({ event: 'message', data: 'hello' })
    })

    it('仅有注释的事件块不触发回调', async () => {
        const stream = createStream([': comment only\n\ndata: real\n\n'])
        const cb = createCallbacks()

        await parseEventStream(stream, cb)

        expect(cb.onEvent).toHaveBeenCalledOnce()
        expect(cb.events[0]).toEqual({ event: 'message', data: 'real' })
    })

    it('流结束前缓冲区中的最后一个事件块也能被解析', async () => {
        const stream = createStream(['data: final'])
        const cb = createCallbacks()

        await parseEventStream(stream, cb)

        expect(cb.onEvent).toHaveBeenCalledOnce()
        expect(cb.events[0]).toEqual({ event: 'message', data: 'final' })
    })

    it('完整的复合事件块解析', async () => {
        const stream = createStream([
            'id: 1\nevent: update\ndata: line1\ndata: line2\nretry: 5000\n\n',
        ])
        const cb = createCallbacks()

        await parseEventStream(stream, cb)

        expect(cb.events[0]).toEqual({
            event: 'update',
            data: 'line1\nline2',
            id: '1',
            retry: 5000,
        })
    })
})
