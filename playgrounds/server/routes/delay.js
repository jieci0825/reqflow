/** 注册延迟响应路由 */
export function registerDelayRoutes(router) {
    router.get('/slow', async ctx => {
        await new Promise(r => setTimeout(r, 3000))
        ctx.body = { code: 0, data: { message: '慢速响应完成（耗时 3s）' } }
    })

    router.get('/delay/:ms', async ctx => {
        const ms = Math.min(Math.max(Number(ctx.params.ms) || 0, 0), 10000)
        await new Promise(r => setTimeout(r, ms))
        ctx.body = { code: 0, data: { message: `响应完成（延迟 ${ms}ms）`, delay: ms } }
    })
}
