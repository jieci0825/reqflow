import Koa from 'koa'
import Router from '@koa/router'
import cors from '@koa/cors'
import bodyParser from 'koa-bodyparser'
const app = new Koa()
const router = new Router({ prefix: '/api' })

// ── Mock 数据 ──

let users = [
    { id: 1, name: '张三', email: 'zhangsan@example.com' },
    { id: 2, name: '李四', email: 'lisi@example.com' },
    { id: 3, name: '王五', email: 'wangwu@example.com' },
]
let nextId = 4

// ── API 路由 ──

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

router.get('/error/500', ctx => {
    ctx.status = 500
    ctx.body = { code: 500, message: '服务器内部错误' }
})

router.get('/slow', async ctx => {
    await new Promise(r => setTimeout(r, 3000))
    ctx.body = { code: 0, data: { message: '慢速响应完成（耗时 3s）' } }
})

router.get('/delay/:ms', async ctx => {
    const ms = Math.min(Math.max(Number(ctx.params.ms) || 0, 0), 10000)
    await new Promise(r => setTimeout(r, ms))
    ctx.body = { code: 0, data: { message: `响应完成（延迟 ${ms}ms）`, delay: ms } }
})

// ── Flaky 端点：前 N 次请求返回 500，之后成功 ──

const flakyCounters = new Map()

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

// ── Dedup 验证端点：带延迟的计数器，用于证明请求是否真正到达服务端 ──

const dedupCounters = new Map()

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

// ── Cache 验证端点：每次请求返回递增计数和时间戳，用于验证缓存是否命中 ──

const cacheCounters = new Map()

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

// ── Dual Token 验证端点：模拟 access/refresh token 双令牌认证流程 ──

let dualTokenStore = {
    access: 'initial-access-token',
    refresh: 'initial-refresh-token',
    generation: 0,
}

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

let dualProtectedCallCount = 0
let dualProtectedFailUntilRefresh = false

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

// ── Race 验证端点：带延迟的计数器，用于验证竞态取消是否生效 ──

const raceCounters = new Map()

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

// ── 中间件 ──

app.use(cors())
app.use(bodyParser())
app.use(router.routes())
app.use(router.allowedMethods())

// ── 启动 ──

const PORT = 3456
app.listen(PORT, () => {
    console.log(`Playground 服务已启动: http://localhost:${PORT}`)
})
