/** 注册 SSE 流式路由 */
export function registerSSERoutes(router) {
    router.get('/sse/event-stream', async ctx => {
        const count = Math.min(Math.max(Number(ctx.query.count) || 5, 1), 50)
        const interval = Math.min(Math.max(Number(ctx.query.interval) || 300, 50), 5000)

        ctx.set('Content-Type', 'text/event-stream')
        ctx.set('Cache-Control', 'no-cache')
        ctx.set('Connection', 'keep-alive')

        const { writable } = ctx.res
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder()

                controller.enqueue(encoder.encode(': SSE stream started\n\n'))
                controller.enqueue(encoder.encode('retry: 3000\n\n'))

                for (let i = 1; i <= count; i++) {
                    await sleep(interval)

                    const eventType = i % 3 === 0 ? 'progress' : 'message'
                    let payload = ''

                    if (eventType === 'progress') {
                        payload += `event: progress\n`
                    }
                    payload += `id: ${i}\n`
                    payload += `data: ${JSON.stringify({ seq: i, total: count, text: `第 ${i}/${count} 条消息` })}\n\n`

                    controller.enqueue(encoder.encode(payload))
                }

                controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ text: '流结束' })}\n\n`))
                controller.close()
            },
        })

        ctx.body = stream
    })

    router.get('/sse/json-stream', async ctx => {
        const count = Math.min(Math.max(Number(ctx.query.count) || 5, 1), 50)
        const interval = Math.min(Math.max(Number(ctx.query.interval) || 300, 50), 5000)

        ctx.set('Content-Type', 'application/x-ndjson')
        ctx.set('Cache-Control', 'no-cache')
        ctx.set('Connection', 'keep-alive')

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder()

                for (let i = 1; i <= count; i++) {
                    await sleep(interval)

                    const line = JSON.stringify({
                        seq: i,
                        total: count,
                        text: `第 ${i}/${count} 条数据`,
                        timestamp: Date.now(),
                    })
                    controller.enqueue(encoder.encode(line + '\n'))
                }

                controller.close()
            },
        })

        ctx.body = stream
    })
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms))
}
