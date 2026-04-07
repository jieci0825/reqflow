const raceCounters = new Map()

/** 注册竞态测试路由 */
export function registerRaceRoutes(router) {
    router.get('/race-test', async ctx => {
        const key = ctx.query.key || 'default'
        const ms = Math.min(Math.max(Number(ctx.query.delay) || 800, 0), 10000)
        const current = (raceCounters.get(key) || 0) + 1
        raceCounters.set(key, current)

        const seq = current

        await new Promise(r => setTimeout(r, ms))
        ctx.body = {
            code: 0,
            data: {
                key,
                seq,
                message: `第 ${seq} 个请求完成（延迟 ${ms}ms）`,
            },
        }
    })

    router.post('/race-test/reset', ctx => {
        raceCounters.clear()
        ctx.body = { code: 0, data: { message: '竞态计数器已重置' } }
    })
}
