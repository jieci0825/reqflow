/** 注册错误模拟路由 */
export function registerErrorRoutes(router) {
    router.get('/error/500', ctx => {
        ctx.status = 500
        ctx.body = { code: 500, message: '服务器内部错误' }
    })
}
