import { createRequest } from 'reqflow'
import { fetchAdapter } from 'reqflow/adapters/fetch'
import { errorPlugin, loadingPlugin, retryPlugin, tokenPlugin } from 'reqflow/plugins'

// ── 工具函数 ──

function $(id) {
    return document.getElementById(id)
}

function log(panelId, type, content) {
    const panel = $(panelId)
    const div = document.createElement('div')
    div.className = `log-${type}`
    div.textContent =
        typeof content === 'string' ? content : JSON.stringify(content, null, 2)
    panel.appendChild(div)
    panel.scrollTop = panel.scrollHeight
}

function clear(panelId) {
    $(panelId).innerHTML = ''
}

function formatTime() {
    return new Date().toLocaleTimeString('zh-CN', { hour12: false })
}

// ── 可变 Token ──

const API_BASE = 'http://localhost:3456'
let currentToken = $('input-token').value

// ── 创建请求实例 ──

const request = createRequest({
    adapter: fetchAdapter(),
    baseURL: API_BASE,
    plugins: [
        loadingPlugin({
            onShow: () => $('loading-bar').classList.add('active'),
            onHide: () => $('loading-bar').classList.remove('active'),
            delay: 200,
        }),
        errorPlugin({
            onError(error) {
                log(
                    'panel-errors',
                    'error',
                    `[${formatTime()}] [${error.type}] ${error.message}`
                )
            },
        }),
        tokenPlugin({
            getToken: () => currentToken,
        }),
    ],
})

// ── 无 Token 的请求实例（用于 401 演示） ──

const requestNoToken = createRequest({
    adapter: fetchAdapter(),
    baseURL: API_BASE,
    plugins: [
        errorPlugin({
            onError(error) {
                log(
                    'panel-errors',
                    'error',
                    `[${formatTime()}] [${error.type}] ${error.message}`
                )
            },
        }),
    ],
})

// ── 1. GET /api/users ──

$('btn-get-users').addEventListener('click', async () => {
    clear('panel-get-users')
    log('panel-get-users', 'info', `→ GET /api/users`)
    try {
        const res = await request.get('/api/users')
        log('panel-get-users', 'success', `← ${res.status} ${res.statusText}`)
        log('panel-get-users', 'success', JSON.stringify(res.data, null, 2))
    } catch (err) {
        log('panel-get-users', 'error', `✗ ${err.message}`)
    }
})

// ── 2. GET /api/users/:id ──

$('btn-get-user').addEventListener('click', async () => {
    clear('panel-get-user')
    const id = $('input-user-id').value
    log('panel-get-user', 'info', `→ GET /api/users/${id}`)
    try {
        const res = await request.get(`/api/users/${id}`)
        log('panel-get-user', 'success', `← ${res.status} ${res.statusText}`)
        log('panel-get-user', 'success', JSON.stringify(res.data, null, 2))
    } catch (err) {
        log('panel-get-user', 'error', `✗ ${err.message}`)
    }
})

// ── 3. POST /api/users ──

$('btn-post-user').addEventListener('click', async () => {
    clear('panel-post-user')
    const name = $('input-name').value
    const email = $('input-email').value
    log(
        'panel-post-user',
        'info',
        `→ POST /api/users  body: ${JSON.stringify({ name, email })}`
    )
    try {
        const res = await request.post(
            '/api/users',
            { name, email },
            {
                headers: { 'Content-Type': 'application/json' },
            }
        )
        log('panel-post-user', 'success', `← ${res.status} ${res.statusText}`)
        log('panel-post-user', 'success', JSON.stringify(res.data, null, 2))
    } catch (err) {
        log('panel-post-user', 'error', `✗ ${err.message}`)
    }
})

// ── 4. GET /api/protected（有 Token） ──

$('btn-protected-ok').addEventListener('click', async () => {
    clear('panel-protected-ok')
    currentToken = $('input-token').value
    log(
        'panel-protected-ok',
        'info',
        `→ GET /api/protected (token: ${currentToken})`
    )
    try {
        const res = await request.get('/api/protected')
        log(
            'panel-protected-ok',
            'success',
            `← ${res.status} ${res.statusText}`
        )
        log('panel-protected-ok', 'success', JSON.stringify(res.data, null, 2))
    } catch (err) {
        log('panel-protected-ok', 'error', `✗ ${err.message}`)
    }
})

// ── 5. GET /api/protected（无 Token） ──

$('btn-protected-fail').addEventListener('click', async () => {
    clear('panel-protected-fail')
    log('panel-protected-fail', 'info', `→ GET /api/protected (无 token)`)
    try {
        const res = await requestNoToken.get('/api/protected')
        log('panel-protected-fail', 'warn', `← ${res.status} ${res.statusText}`)
        log('panel-protected-fail', 'warn', JSON.stringify(res.data, null, 2))
    } catch (err) {
        log('panel-protected-fail', 'error', `✗ ${err.message}`)
    }
})

// ── 6. GET /api/error/500 ──

$('btn-error-500').addEventListener('click', async () => {
    clear('panel-error-500')
    log('panel-error-500', 'info', `→ GET /api/error/500`)
    try {
        const res = await request.get('/api/error/500')
        log('panel-error-500', 'warn', `← ${res.status} ${res.statusText}`)
        log('panel-error-500', 'warn', JSON.stringify(res.data, null, 2))
    } catch (err) {
        log('panel-error-500', 'error', `✗ ${err.message}`)
    }
})

// ── 7. GET /api/slow（超时） ──

$('btn-timeout').addEventListener('click', async () => {
    clear('panel-timeout')
    log('panel-timeout', 'info', `→ GET /api/slow (timeout: 1000ms)`)
    try {
        const res = await request.get('/api/slow', { timeout: 1000 })
        log('panel-timeout', 'success', `← ${res.status} ${res.statusText}`)
        log('panel-timeout', 'success', JSON.stringify(res.data, null, 2))
    } catch (err) {
        log('panel-timeout', 'error', `✗ 请求超时或中止: ${err.message}`)
    }
})

// ── 8. loadingPlugin 演示 ──

$('btn-loading-slow').addEventListener('click', async () => {
    clear('panel-loading')
    const ms = $('input-delay-ms').value || 2000
    log('panel-loading', 'info', `[${formatTime()}] → GET /api/delay/${ms}`)
    log('panel-loading', 'info', `[${formatTime()}] loading 配置: delay=200ms，请求 >200ms 时顶部加载条出现`)
    try {
        const res = await request.get(`/api/delay/${ms}`)
        log('panel-loading', 'success', `[${formatTime()}] ← ${res.status} ${JSON.stringify(res.data)}`)
    } catch (err) {
        log('panel-loading', 'error', `[${formatTime()}] ✗ ${err.message}`)
    }
})

$('btn-loading-fast').addEventListener('click', async () => {
    clear('panel-loading')
    log('panel-loading', 'info', `[${formatTime()}] → GET /api/delay/50`)
    log('panel-loading', 'info', `[${formatTime()}] 请求仅 50ms，低于 delay=200ms 阈值，加载条不会出现`)
    try {
        const res = await request.get('/api/delay/50')
        log('panel-loading', 'success', `[${formatTime()}] ← ${res.status} ${JSON.stringify(res.data)}`)
    } catch (err) {
        log('panel-loading', 'error', `[${formatTime()}] ✗ ${err.message}`)
    }
})

$('btn-loading-silent').addEventListener('click', async () => {
    clear('panel-loading')
    log('panel-loading', 'info', `[${formatTime()}] → GET /api/delay/2000 (meta.silent = true)`)
    log('panel-loading', 'info', `[${formatTime()}] silent 请求不参与 loading 计数，加载条不会出现`)
    try {
        const res = await request.get('/api/delay/2000', { meta: { silent: true } })
        log('panel-loading', 'success', `[${formatTime()}] ← ${res.status} ${JSON.stringify(res.data)}`)
    } catch (err) {
        log('panel-loading', 'error', `[${formatTime()}] ✗ ${err.message}`)
    }
})

$('btn-loading-concurrent').addEventListener('click', async () => {
    clear('panel-loading')
    log('panel-loading', 'info', `[${formatTime()}] → 并发 3 个请求: /api/delay/1000, /api/delay/2000, /api/delay/3000`)
    log('panel-loading', 'info', `[${formatTime()}] 加载条在第一个请求进入时出现，最后一个完成后消失`)
    try {
        const results = await Promise.all([
            request.get('/api/delay/1000'),
            request.get('/api/delay/2000'),
            request.get('/api/delay/3000'),
        ])
        for (const res of results) {
            log('panel-loading', 'success', `[${formatTime()}] ← ${res.status} ${JSON.stringify(res.data)}`)
        }
    } catch (err) {
        log('panel-loading', 'error', `[${formatTime()}] ✗ ${err.message}`)
    }
})

// ── 9. retryPlugin 演示 ──

let retryKey = 0

function createRetryRequest(retryOpts) {
    return createRequest({
        adapter: fetchAdapter(),
        baseURL: API_BASE,
        plugins: [
            retryPlugin(retryOpts),
            errorPlugin({
                onError(error) {
                    log(
                        'panel-errors',
                        'error',
                        `[${formatTime()}] [${error.type}] ${error.message}`
                    )
                },
            }),
        ],
    })
}

$('btn-retry-basic').addEventListener('click', async () => {
    clear('panel-retry')
    const maxRetries = Number($('input-max-retries').value) || 3
    const failCount = Number($('input-fail-count').value) || 2
    const key = `basic-${++retryKey}`

    log('panel-retry', 'info', `[${formatTime()}] 配置: maxRetries=${maxRetries}, delay=0, 服务端失败${failCount}次后成功`)
    log('panel-retry', 'info', `[${formatTime()}] → GET /api/flaky/${failCount}`)

    const req = createRetryRequest({ maxRetries })
    try {
        const res = await req.get(`/api/flaky/${failCount}?key=${key}`)
        log('panel-retry', 'success', `[${formatTime()}] ← ${res.status} ${JSON.stringify(res.data)}`)
        const retries = res.config?.meta?.retryCount || 0
        log('panel-retry', 'success', `[${formatTime()}] 共重试 ${retries} 次`)
    } catch (err) {
        log('panel-retry', 'error', `[${formatTime()}] ✗ ${err.message}`)
    }
})

$('btn-retry-delay').addEventListener('click', async () => {
    clear('panel-retry')
    const maxRetries = Number($('input-max-retries').value) || 3
    const failCount = Number($('input-fail-count').value) || 2
    const key = `delay-${++retryKey}`

    log('panel-retry', 'info', `[${formatTime()}] 配置: maxRetries=${maxRetries}, delay=500ms, 服务端失败${failCount}次后成功`)
    log('panel-retry', 'info', `[${formatTime()}] → GET /api/flaky/${failCount}`)

    const req = createRetryRequest({ maxRetries, delay: 500 })
    try {
        const res = await req.get(`/api/flaky/${failCount}?key=${key}`)
        log('panel-retry', 'success', `[${formatTime()}] ← ${res.status} ${JSON.stringify(res.data)}`)
        const retries = res.config?.meta?.retryCount || 0
        log('panel-retry', 'success', `[${formatTime()}] 共重试 ${retries} 次，每次间隔 500ms`)
    } catch (err) {
        log('panel-retry', 'error', `[${formatTime()}] ✗ ${err.message}`)
    }
})

$('btn-retry-backoff').addEventListener('click', async () => {
    clear('panel-retry')
    const maxRetries = Number($('input-max-retries').value) || 3
    const failCount = Number($('input-fail-count').value) || 2
    const key = `backoff-${++retryKey}`

    const backoffFn = (attempt) => Math.min(1000 * Math.pow(2, attempt - 1), 8000)
    log('panel-retry', 'info', `[${formatTime()}] 配置: maxRetries=${maxRetries}, delay=指数退避 min(1000*2^(n-1), 8000)ms`)
    log('panel-retry', 'info', `[${formatTime()}] 退避序列: ${Array.from({ length: maxRetries }, (_, i) => backoffFn(i + 1) + 'ms').join(' → ')}`)
    log('panel-retry', 'info', `[${formatTime()}] → GET /api/flaky/${failCount}`)

    const req = createRetryRequest({ maxRetries, delay: backoffFn })
    try {
        const res = await req.get(`/api/flaky/${failCount}?key=${key}`)
        log('panel-retry', 'success', `[${formatTime()}] ← ${res.status} ${JSON.stringify(res.data)}`)
        const retries = res.config?.meta?.retryCount || 0
        log('panel-retry', 'success', `[${formatTime()}] 共重试 ${retries} 次（指数退避）`)
    } catch (err) {
        log('panel-retry', 'error', `[${formatTime()}] ✗ ${err.message}`)
    }
})

$('btn-retry-fail').addEventListener('click', async () => {
    clear('panel-retry')
    const maxRetries = Number($('input-max-retries').value) || 3
    const key = `fail-${++retryKey}`
    const failCount = maxRetries + 5

    log('panel-retry', 'info', `[${formatTime()}] 配置: maxRetries=${maxRetries}, 服务端持续失败${failCount}次`)
    log('panel-retry', 'info', `[${formatTime()}] 预期: 重试 ${maxRetries} 次后仍失败，返回最后的错误响应`)
    log('panel-retry', 'info', `[${formatTime()}] → GET /api/flaky/${failCount}`)

    const req = createRetryRequest({ maxRetries, delay: 300 })
    try {
        const res = await req.get(`/api/flaky/${failCount}?key=${key}`)
        if (res.status >= 400) {
            log('panel-retry', 'warn', `[${formatTime()}] ← ${res.status} ${JSON.stringify(res.data)}`)
            log('panel-retry', 'warn', `[${formatTime()}] 重试耗尽，返回最终失败响应`)
        } else {
            log('panel-retry', 'success', `[${formatTime()}] ← ${res.status} ${JSON.stringify(res.data)}`)
        }
    } catch (err) {
        log('panel-retry', 'error', `[${formatTime()}] ✗ 重试耗尽: ${err.message}`)
    }
})

$('btn-retry-condition').addEventListener('click', async () => {
    clear('panel-retry')
    const maxRetries = Number($('input-max-retries').value) || 3
    const key = `cond-${++retryKey}`

    log('panel-retry', 'info', `[${formatTime()}] 配置: maxRetries=${maxRetries}, retryOn=仅 HTTP 5xx 错误`)
    log('panel-retry', 'info', `[${formatTime()}] → GET /api/flaky/2 (5xx 错误，会重试)`)

    const req = createRetryRequest({
        maxRetries,
        delay: 300,
        retryOn: (error) => error.type === 'http' && error.status >= 500,
    })

    try {
        const res = await req.get(`/api/flaky/2?key=${key}`)
        log('panel-retry', 'success', `[${formatTime()}] ← ${res.status} ${JSON.stringify(res.data)}`)
        const retries = res.config?.meta?.retryCount || 0
        log('panel-retry', 'success', `[${formatTime()}] 共重试 ${retries} 次（仅 5xx 条件触发）`)
    } catch (err) {
        log('panel-retry', 'error', `[${formatTime()}] ✗ ${err.message}`)
    }

    log('panel-retry', 'info', ``)
    log('panel-retry', 'info', `[${formatTime()}] → GET /api/protected (401 错误，不满足 retryOn 条件，不会重试)`)

    const req2 = createRetryRequest({
        maxRetries,
        delay: 300,
        retryOn: (error) => error.type === 'http' && error.status >= 500,
    })

    try {
        const res = await req2.get('/api/protected')
        log('panel-retry', 'warn', `[${formatTime()}] ← ${res.status} ${JSON.stringify(res.data)}`)
        log('panel-retry', 'warn', `[${formatTime()}] 401 不满足 5xx 条件，未重试，直接返回`)
    } catch (err) {
        log('panel-retry', 'error', `[${formatTime()}] ✗ ${err.message}`)
    }
})

// ── 清空错误日志 ──

$('btn-clear-errors').addEventListener('click', () => {
    clear('panel-errors')
})
