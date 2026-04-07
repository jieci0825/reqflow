let users = [
    { id: 1, name: '张三', email: 'zhangsan@example.com' },
    { id: 2, name: '李四', email: 'lisi@example.com' },
    { id: 3, name: '王五', email: 'wangwu@example.com' },
]
let nextId = 4

/** 注册用户 CRUD 路由 */
export function registerUserRoutes(router) {
    router.get('/users', ctx => {
        ctx.body = { code: 0, data: users }
    })

    router.get('/users/:id', ctx => {
        const user = users.find(u => u.id === Number(ctx.params.id))
        if (!user) {
            ctx.status = 404
            ctx.body = { code: 404, message: '用户不存在' }
            return
        }
        ctx.body = { code: 0, data: user }
    })

    router.post('/users', ctx => {
        const { name, email } = ctx.request.body
        const user = { id: nextId++, name, email }
        users.push(user)
        ctx.status = 201
        ctx.body = { code: 0, data: user }
    })
}
