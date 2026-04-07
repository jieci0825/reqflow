const cacheCounters = new Map()

/** 注册缓存测试路由 */
export function registerCacheRoutes(router) {
    router.get('/cache-test', async ctx => {
        const key = ctx.query.key || 'default'
        const ms = Math.min(Math.max(Number(ctx.query.delay) || 200, 0), 10000)
        const current = (cacheCounters.get(key) || 0) + 1
        cacheCounters.set(key, current)

        await new Promise(r => setTimeout(r, ms))
        ctx.body = {
            code: 0,
            data: {
                key,
                hitCount: current,
                timestamp: Date.now(),
                message: `第 ${current} 次请求到达服务端`,
            },
        }
    })

    router.post('/cache-test/reset', ctx => {
        cacheCounters.clear()
        ctx.body = { code: 0, data: { message: '缓存计数器已重置' } }
    })
}
