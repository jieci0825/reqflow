import type { JSONStreamParserCallbacks } from '../types'

/** 按 NDJSON 格式解析 ReadableStream，逐行 JSON.parse 后回调 */
export async function parseJSONStream<T = any>(
    stream: ReadableStream<Uint8Array>,
    callbacks: JSONStreamParserCallbacks<T>
): Promise<void> {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
        while (true) {
            const { done, value } = await reader.read()

            if (done) {
                if (buffer.trim().length > 0) {
                    parseLine(buffer.trim(), callbacks)
                }
                break
            }

            buffer += decoder.decode(value, { stream: true })

            const lines = buffer.split('\n')
            buffer = lines.pop()!

            for (const line of lines) {
                const trimmed = line.trim()
                if (trimmed.length > 0) {
                    parseLine(trimmed, callbacks)
                }
            }
        }
    } finally {
        reader.releaseLock()
    }
}

function parseLine<T>(
    line: string,
    callbacks: JSONStreamParserCallbacks<T>
): void {
    try {
        const data = JSON.parse(line) as T
        callbacks.onJSON(data)
    } catch (error) {
        callbacks.onError(
            error instanceof Error
                ? error
                : new Error(`JSON parse failed: ${line}`)
        )
    }
}
