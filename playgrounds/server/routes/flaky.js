const flakyCounters = new Map()

/** 注册不稳定端点路由（用于重试测试） */
export function registerFlakyRoutes(router) {
    router.get('/flaky/:failCount', ctx => {
        const failCount = Math.max(Number(ctx.params.failCount) || 0, 0)
        const key = ctx.query.key || 'default'
        const current = flakyCounters.get(key) || 0
        flakyCounters.set(key, current + 1)

        if (current < failCount) {
            ctx.status = 500
            ctx.body = {
                code: 500,
                message: `模拟失败 (${current + 1}/${failCount})`,
                attempt: current + 1,
            }
            return
        }

        flakyCounters.delete(key)
        ctx.body = {
            code: 0,
            data: {
                message: `第 ${current + 1} 次请求成功`,
                totalAttempts: current + 1,
            },
        }
    })

    router.post('/flaky/reset', ctx => {
        flakyCounters.clear()
        ctx.body = { code: 0, data: { message: '计数器已重置' } }
    })
}
