import { describe, expect, it, vi } from 'vitest'

import { parseJSONStream } from '@/sse/parsers/json-stream'

import type { JSONStreamParserCallbacks } from '@/sse/types'

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

function createCallbacks<T = any>(): JSONStreamParserCallbacks<T> & { items: T[], errors: Error[] } {
    const items: T[] = []
    const errors: Error[] = []
    return {
        items,
        errors,
        onJSON: vi.fn((data: T) => items.push(data)),
        onError: vi.fn((error: Error) => errors.push(error)),
    }
}

describe('parseJSONStream', () => {
    it('两行 NDJSON → 两次回调', async () => {
        const stream = createStream(['{"text":"hello"}\n{"text":"world"}\n'])
        const cb = createCallbacks()

        await parseJSONStream(stream, cb)

        expect(cb.onJSON).toHaveBeenCalledTimes(2)
        expect(cb.items[0]).toEqual({ text: 'hello' })
        expect(cb.items[1]).toEqual({ text: 'world' })
    })

    it('空行跳过', async () => {
        const stream = createStream(['{"a":1}\n\n\n{"b":2}\n'])
        const cb = createCallbacks()

        await parseJSONStream(stream, cb)

        expect(cb.onJSON).toHaveBeenCalledTimes(2)
        expect(cb.items[0]).toEqual({ a: 1 })
        expect(cb.items[1]).toEqual({ b: 2 })
    })

    it('非法 JSON 触发 error', async () => {
        const stream = createStream(['{"valid":true}\nnot-json\n{"also":true}\n'])
        const cb = createCallbacks()

        await parseJSONStream(stream, cb)

        expect(cb.onJSON).toHaveBeenCalledTimes(2)
        expect(cb.onError).toHaveBeenCalledOnce()
        expect(cb.errors[0]).toBeInstanceOf(Error)
    })

    it('跨 chunk 边界正确拼接', async () => {
        const stream = createStream(['{"te', 'xt":"hello"}\n'])
        const cb = createCallbacks()

        await parseJSONStream(stream, cb)

        expect(cb.onJSON).toHaveBeenCalledOnce()
        expect(cb.items[0]).toEqual({ text: 'hello' })
    })

    it('流结束前缓冲区中的最后一行也能被解析', async () => {
        const stream = createStream(['{"final":true}'])
        const cb = createCallbacks()

        await parseJSONStream(stream, cb)

        expect(cb.onJSON).toHaveBeenCalledOnce()
        expect(cb.items[0]).toEqual({ final: true })
    })

    it('支持数组和原始值类型', async () => {
        const stream = createStream(['[1,2,3]\n42\n"hello"\n'])
        const cb = createCallbacks()

        await parseJSONStream(stream, cb)

        expect(cb.onJSON).toHaveBeenCalledTimes(3)
        expect(cb.items[0]).toEqual([1, 2, 3])
        expect(cb.items[1]).toBe(42)
        expect(cb.items[2]).toBe('hello')
    })

    it('多个 chunk 分散的多行 JSON', async () => {
        const stream = createStream([
            '{"id":1}\n{"id":2}\n',
            '{"id":3}\n',
        ])
        const cb = createCallbacks()

        await parseJSONStream(stream, cb)

        expect(cb.onJSON).toHaveBeenCalledTimes(3)
        expect(cb.items.map((i: any) => i.id)).toEqual([1, 2, 3])
    })
})
