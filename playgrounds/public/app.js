import { createRequest } from 'reqflow'
import { fetchAdapter } from 'reqflow/adapters/fetch'
import { errorPlugin, tokenPlugin } from 'reqflow/plugins'

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

// ── 清空错误日志 ──

$('btn-clear-errors').addEventListener('click', () => {
    clear('panel-errors')
})
