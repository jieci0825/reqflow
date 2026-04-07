let dualTokenStore = {
    access: 'initial-access-token',
    refresh: 'initial-refresh-token',
    generation: 0,
}

let dualProtectedCallCount = 0
let dualProtectedFailUntilRefresh = false

/** 注册认证相关路由（单令牌保护 + 双令牌流程） */
export function registerAuthRoutes(router) {
    router.get('/protected', ctx => {
        const auth = ctx.headers.authorization
        if (!auth || !auth.startsWith('Bearer ')) {
            ctx.status = 401
            ctx.body = { code: 401, message: '未提供有效的认证令牌' }
            return
        }
        ctx.body = {
            code: 0,
            data: {
                message: '认证成功',
                token: auth.slice(7),
                receivedHeader: auth,
            },
        }
    })

    router.post('/auth/refresh', ctx => {
        const { refreshToken } = ctx.request.body || {}

        if (!refreshToken || refreshToken !== dualTokenStore.refresh) {
            ctx.status = 401
            ctx.body = { code: 401, message: 'Refresh token 无效或已过期' }
            return
        }

        dualTokenStore.generation++
        dualTokenStore.access = `access-token-gen${dualTokenStore.generation}`
        dualTokenStore.refresh = `refresh-token-gen${dualTokenStore.generation}`

        ctx.body = {
            access: dualTokenStore.access,
            refresh: dualTokenStore.refresh,
        }
    })

    router.get('/dual-protected', async ctx => {
        const delay = Math.min(Math.max(Number(ctx.query.delay) || 0, 0), 10000)
        if (delay > 0) await new Promise(r => setTimeout(r, delay))

        const auth = ctx.headers.authorization
        if (!auth || !auth.startsWith('Bearer ')) {
            ctx.status = 401
            ctx.body = { code: 401, message: '未提供认证令牌' }
            return
        }

        const token = auth.slice(7)
        dualProtectedCallCount++

        if (dualProtectedFailUntilRefresh && token === dualTokenStore.access) {
            dualProtectedFailUntilRefresh = false
        }

        if (dualProtectedFailUntilRefresh) {
            ctx.status = 401
            ctx.body = { code: 401, message: 'Access token 已失效', call: dualProtectedCallCount }
            return
        }

        ctx.body = {
            code: 0,
            data: {
                message: '认证成功',
                token,
                call: dualProtectedCallCount,
            },
        }
    })

    router.post('/dual-token/expire-access', ctx => {
        dualProtectedFailUntilRefresh = true
        ctx.body = { code: 0, data: { message: 'Access token 已标记为失效，下次请求将返回 401' } }
    })

    router.post('/dual-token/reset', ctx => {
        dualTokenStore = {
            access: 'initial-access-token',
            refresh: 'initial-refresh-token',
            generation: 0,
        }
        dualProtectedCallCount = 0
        dualProtectedFailUntilRefresh = false
        ctx.body = { code: 0, data: { message: '双 Token 状态已重置' } }
    })

    router.post('/dual-token/invalidate-refresh', ctx => {
        dualTokenStore.refresh = 'invalidated-' + Date.now()
        dualProtectedFailUntilRefresh = true
        ctx.body = { code: 0, data: { message: 'Refresh token 已失效，刷新请求将返回 401' } }
    })
}
