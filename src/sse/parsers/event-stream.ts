import type { SSEEvent, SSEParserCallbacks } from '../types'

/** 按照 SSE 规范解析 ReadableStream，逐条回调 SSEEvent */
export async function parseEventStream(
    stream: ReadableStream<Uint8Array>,
    callbacks: SSEParserCallbacks
): Promise<void> {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
        while (true) {
            const { done, value } = await reader.read()

            if (done) {
                if (buffer.trim().length > 0) {
                    dispatchEvent(buffer, callbacks)
                }
                break
            }

            buffer += decoder.decode(value, { stream: true })

            const blocks = buffer.split('\n\n')
            buffer = blocks.pop()!

            for (const block of blocks) {
                if (block.trim().length > 0) {
                    dispatchEvent(block, callbacks)
                }
            }
        }
    } finally {
        reader.releaseLock()
    }
}

function dispatchEvent(block: string, callbacks: SSEParserCallbacks): void {
    const lines = block.split('\n')
    let event = 'message'
    const dataLines: string[] = []
    let id: string | undefined
    let retry: number | undefined

    for (const line of lines) {
        if (line.startsWith(':')) {
            continue
        }

        const colonIdx = line.indexOf(':')

        if (colonIdx === -1) {
            processField(line, '', { setEvent, addData, setId, setRetry })
            continue
        }

        const field = line.slice(0, colonIdx)
        const rawValue = line.slice(colonIdx + 1)
        const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue

        processField(field, value, { setEvent, addData, setId, setRetry })
    }

    if (dataLines.length === 0) {
        return
    }

    const sseEvent: SSEEvent = {
        event,
        data: dataLines.join('\n'),
    }

    if (id !== undefined) {
        sseEvent.id = id
    }

    if (retry !== undefined) {
        sseEvent.retry = retry
    }

    callbacks.onEvent(sseEvent)

    function setEvent(v: string): void {
        event = v
    }

    function addData(v: string): void {
        dataLines.push(v)
    }

    function setId(v: string): void {
        id = v
    }

    function setRetry(v: number): void {
        retry = v
    }
}

function processField(
    field: string,
    value: string,
    handlers: {
        setEvent: (v: string) => void
        addData: (v: string) => void
        setId: (v: string) => void
        setRetry: (v: number) => void
    }
): void {
    switch (field) {
        case 'event':
            handlers.setEvent(value)
            break
        case 'data':
            handlers.addData(value)
            break
        case 'id':
            handlers.setId(value)
            break
        case 'retry': {
            const num = Number.parseInt(value, 10)
            if (!Number.isNaN(num)) {
                handlers.setRetry(num)
            }
            break
        }
    }
}
