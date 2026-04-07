const dedupCounters = new Map()

/** 注册去重测试路由 */
export function registerDedupRoutes(router) {
    router.get('/dedup-test', async ctx => {
        const key = ctx.query.key || 'default'
        const ms = Math.min(Math.max(Number(ctx.query.delay) || 500, 0), 10000)
        const current = (dedupCounters.get(key) || 0) + 1
        dedupCounters.set(key, current)

        await new Promise(r => setTimeout(r, ms))
        ctx.body = {
            code: 0,
            data: {
                key,
                hitCount: current,
                message: `第 ${current} 次命中（延迟 ${ms}ms）`,
            },
        }
    })

    router.post('/dedup-test/reset', ctx => {
        dedupCounters.clear()
        ctx.body = { code: 0, data: { message: '去重计数器已重置' } }
    })
}
