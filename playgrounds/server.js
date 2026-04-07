import Koa from 'koa'
import Router from '@koa/router'
import cors from '@koa/cors'
import bodyParser from 'koa-bodyparser'
import serve from 'koa-static'
import mount from 'koa-mount'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

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

// ── 中间件 & 静态文件 ──

app.use(cors())
app.use(bodyParser())
app.use(router.routes())
app.use(router.allowedMethods())
app.use(mount('/dist', serve(resolve(__dirname, '../dist'))))
app.use(serve(resolve(__dirname, 'public')))

// ── 启动 ──

const PORT = 3456
app.listen(PORT, () => {
    console.log(`Playground 服务已启动: http://localhost:${PORT}`)
})
